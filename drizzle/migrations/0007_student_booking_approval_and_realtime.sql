ALTER TABLE public.bookings ADD COLUMN approval_status text NOT NULL DEFAULT 'approved', ADD COLUMN requested_by text, ADD COLUMN requested_at timestamptz, ADD COLUMN reviewed_by text, ADD COLUMN reviewed_at timestamptz, ADD COLUMN decision_notes text;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_approval_status_check CHECK (approval_status IN ('pending','approved','declined'));
CREATE OR REPLACE FUNCTION public.guard_booking_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_member text := public.current_member_id(new.tenant_id); v_role public.app_role; v_changed boolean;
BEGIN
 IF auth.uid() IS NULL THEN RETURN new; END IF;
 SELECT role INTO v_role FROM public.member_roles WHERE tenant_id=new.tenant_id AND member_id=v_member AND archived_at IS NULL ORDER BY CASE WHEN role='admin' THEN 0 ELSE 1 END LIMIT 1;
 IF v_role IS NULL OR v_role='ground' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='You cannot change bookings.'; END IF;
 IF TG_OP='INSERT' THEN
  new.requested_by := v_member; new.requested_at := now(); new.reviewed_by := NULL; new.reviewed_at := NULL; new.decision_notes := NULL;
  IF v_role='student' THEN
   IF new.student_id IS DISTINCT FROM v_member OR new.type='maintenance' OR new.status<>'scheduled' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Students can only request their own flights.'; END IF;
   new.approval_status := 'pending';
  ELSE new.approval_status := 'approved'; END IF;
 ELSE
  IF new.tenant_id IS DISTINCT FROM old.tenant_id OR new.id IS DISTINCT FROM old.id OR new.requested_by IS DISTINCT FROM old.requested_by OR new.requested_at IS DISTINCT FROM old.requested_at THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Booking identity cannot be changed.'; END IF;
  v_changed := ROW(new.starts_at,new.ends_at,new.type,new.aircraft_id,new.student_id,new.instructor_id,new.lesson_id,new.route,new.notes) IS DISTINCT FROM ROW(old.starts_at,old.ends_at,old.type,old.aircraft_id,old.student_id,old.instructor_id,old.lesson_id,old.route,old.notes);
  IF v_role='student' THEN
   IF old.student_id IS DISTINCT FROM v_member OR new.student_id IS DISTINCT FROM v_member OR new.type='maintenance' OR old.status IN ('completed','cancelled') OR new.status NOT IN ('scheduled','cancelled') OR new.archived_at IS DISTINCT FROM old.archived_at THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='You can only change or cancel your own active booking.'; END IF;
   IF new.approval_status IS DISTINCT FROM old.approval_status OR new.reviewed_by IS DISTINCT FROM old.reviewed_by OR new.reviewed_at IS DISTINCT FROM old.reviewed_at OR new.decision_notes IS DISTINCT FROM old.decision_notes THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Only administrators can approve bookings.'; END IF;
   IF v_changed AND new.status='scheduled' THEN new.approval_status:='pending'; new.requested_at:=now(); new.reviewed_by:=NULL; new.reviewed_at:=NULL; new.decision_notes:=NULL; END IF;
  ELSE
   IF (new.approval_status IS DISTINCT FROM old.approval_status OR (old.approval_status='pending' AND (new.status IS DISTINCT FROM old.status OR v_changed))) AND v_role<>'admin' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Only administrators can review student bookings.'; END IF;
   IF new.approval_status IS DISTINCT FROM old.approval_status THEN
    IF old.approval_status<>'pending' OR new.approval_status NOT IN ('approved','declined') OR old.status<>'scheduled' THEN RAISE EXCEPTION 'Booking already reviewed or cancelled.'; END IF;
    new.reviewed_by:=v_member; new.reviewed_at:=now();
    IF new.approval_status='declined' THEN new.status:='cancelled'; END IF;
   END IF;
  END IF;
 END IF;
 IF new.status='completed' AND new.approval_status<>'approved' THEN RAISE EXCEPTION 'Pending bookings cannot be completed.'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER trg_booking_approval BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_booking_approval();
CREATE OR REPLACE FUNCTION public.booking_outcome_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor text:=public.current_member_id(new.tenant_id); v_name text; v_role public.app_role; v_action text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN new; END IF;
 SELECT m.name,r.role INTO v_name,v_role FROM public.tenant_members m JOIN public.member_roles r ON r.tenant_id=m.tenant_id AND r.member_id=m.id WHERE m.tenant_id=new.tenant_id AND m.id=v_actor AND r.archived_at IS NULL LIMIT 1;
 IF TG_OP='INSERT' THEN v_action:=CASE WHEN new.approval_status='pending' THEN 'booking_requested' ELSE 'booking_created' END;
 ELSIF new.approval_status='declined' AND old.approval_status='pending' THEN v_action:='booking_declined';
 ELSIF new.status='cancelled' AND old.status<>'cancelled' THEN v_action:='booking_cancelled';
 ELSIF new.approval_status='approved' AND old.approval_status='pending' THEN v_action:='booking_approved';
 ELSIF new.approval_status='pending' AND (old.approval_status<>'pending' OR new.requested_at IS DISTINCT FROM old.requested_at) THEN v_action:='booking_requested';
 ELSE v_action:='booking_updated'; END IF;
 INSERT INTO public.activity_feed(tenant_id,id,occurred_at,actor_id,actor_name,actor_role,action,entity_type,entity_id,details) VALUES(new.tenant_id,gen_random_uuid()::text,now(),v_actor,v_name,v_role,v_action,'booking',new.id,replace(v_action,'_',' ') || ' · ' || new.id || ' · ' || new.starts_at::text || CASE WHEN coalesce(new.decision_notes,'')<>'' THEN ' · ' || new.decision_notes ELSE '' END);
 RETURN new;
END $$;
CREATE TRIGGER trg_booking_outcome AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.booking_outcome_activity();
CREATE OR REPLACE FUNCTION public.guard_flight_booking_approval() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF new.booking_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.bookings WHERE tenant_id=new.tenant_id AND id=new.booking_id AND approval_status='approved' AND status<>'cancelled' AND archived_at IS NULL) THEN RAISE EXCEPTION 'The booking must be approved before a flight is logged.'; END IF; RETURN new; END $$;
CREATE TRIGGER trg_flight_booking_approval BEFORE INSERT OR UPDATE ON public.flights FOR EACH ROW EXECUTE FUNCTION public.guard_flight_booking_approval();
DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('spatial_ref_sys') LOOP IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t); END IF; END LOOP; END $$;
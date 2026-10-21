CREATE OR REPLACE FUNCTION public.guard_booking_upsert_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.bookings WHERE tenant_id=new.tenant_id AND id=new.id) THEN
  RETURN new;
 END IF;
 RETURN public.guard_booking_approval();
END $$;
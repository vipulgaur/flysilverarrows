@echo off
node "%~dp0run.mjs" %*
if errorlevel 1 pause
; Heavy Truck Interceptor Portable Launcher Script
!include "FileFunc.nsh"

Name "Heavy Truck Interceptor (Portable)"
OutFile "dist\HeavyTruckInterceptor-Portable-v1.0.0.exe"
RequestExecutionLevel user
SilentInstall silent
SetCompressor /SOLID lzma

Section "Main"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\app"
  File /r "build_dist\HeavyTruckInterceptor\*.*"

  ExecWait '"$PLUGINSDIR\app\HeavyTruckInterceptor.exe"'
SectionEnd

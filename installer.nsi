; Heavy Truck Interceptor Installer Script
!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "Heavy Truck Interceptor"
OutFile "dist\HeavyTruckInterceptor-Setup-v1.0.0.exe"
InstallDir "$LOCALAPPDATA\Programs\HeavyTruckInterceptor"
RequestExecutionLevel user
SetCompressor /SOLID lzma

; Interface Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\HeavyTruckInterceptor.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Heavy Truck Interceptor"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Japanese"

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "build_dist\HeavyTruckInterceptor\*.*"

  ; Create Shortcuts
  CreateDirectory "$SMPROGRAMS\Heavy Truck Interceptor"
  CreateShortcut "$SMPROGRAMS\Heavy Truck Interceptor\Heavy Truck Interceptor.lnk" "$INSTDIR\HeavyTruckInterceptor.exe"
  CreateShortcut "$SMPROGRAMS\Heavy Truck Interceptor\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Heavy Truck Interceptor.lnk" "$INSTDIR\HeavyTruckInterceptor.exe"

  ; Write Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Registry for Add/Remove Programs
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HeavyTruckInterceptor" "DisplayName" "Heavy Truck Interceptor"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HeavyTruckInterceptor" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HeavyTruckInterceptor" "DisplayIcon" '"$INSTDIR\HeavyTruckInterceptor.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HeavyTruckInterceptor" "Publisher" "youyouboydragonOfficial"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HeavyTruckInterceptor" "DisplayVersion" "1.0.0"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Heavy Truck Interceptor.lnk"
  Delete "$SMPROGRAMS\Heavy Truck Interceptor\*.*"
  RMDir "$SMPROGRAMS\Heavy Truck Interceptor"

  RMDir /r "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HeavyTruckInterceptor"
SectionEnd

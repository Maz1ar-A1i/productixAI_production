; Script for Inno Setup to create Productix AI Installer
#define MyAppName "Productix AI"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "AI TechHub"
#define MyAppExeName "ProductixAI.exe"

[Setup]
AppId={{D3F9A1B2-7C8E-4A5B-9D2C-E1F0A2B3C4D5}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=installer
OutputBaseFilename=ProductixAI_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; The main executable
Source: "E:\ProductixAI\dist\ProductixAI\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
; All supporting files in _internal
Source: "E:\ProductixAI\dist\ProductixAI\_internal\*"; DestDir: "{app}\_internal"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

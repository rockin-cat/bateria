# ROCKIN · Bateria per a Windows (.exe)

Embolcall d'Electron que obre el joc com a aplicació d'escriptori (amb MIDI i progrés desat).

Com es munta (sense instal·lar res amb npm):

1. Baixeu `electron-v33.2.1-win32-x64.zip` de les versions d'Electron a GitHub i descomprimiu-lo a `ROCKIN-Bateria/`.
2. Esborreu `resources/default_app.asar` i creeu `resources/app/` amb `main.js`, `package.json` i una carpeta `app/` amb el joc (`git archive HEAD | tar -x -C resources/app/app`).
3. Reanomeneu `electron.exe` a `ROCKIN Bateria.exe` i comprimiu la carpeta.

L'executable no està signat: Windows avisa la primera vegada («Més informació → Executa igualment»).

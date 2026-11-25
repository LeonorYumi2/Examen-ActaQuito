# Verificación de Sentry en ActaQuito

## Expo Go

Desde PowerShell, en la raíz del proyecto, verificar que el DSN local exista sin mostrarlo.

```powershell
node --env-file=.env -e "console.log(process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ? 'DSN local presente' : 'DSN local ausente')"
$env:EXPO_PUBLIC_SENTRY_DEV_TEST = '1'
npx expo start --clear
```

Abrir ActaQuito en Expo Go y, en el login, pulsar **Probar Sentry (desarrollo)** debajo de **Olvidé mi contraseña**. La alerta muestra el ID solicitado y Metro registra ese mismo ID. No hace falta iniciar sesión ni abrir DevTools.

Buscar el ID en Sentry, en el entorno de desarrollo, con la etiqueta **prueba:javascript-interfaz**. La etiqueta distingue este evento del enviado desde Node. La alerta confirma la solicitud al SDK. La recepción se comprueba en Sentry.

Después de cerrar Metro, retirar el opt-in de la sesión de PowerShell.

```powershell
Remove-Item Env:EXPO_PUBLIC_SENTRY_DEV_TEST -ErrorAction SilentlyContinue
```

## EAS y mapas de código

Configurar en el entorno `preview` del proyecto Expo estas variables.

| Variable | Uso |
| --- | --- |
| `EXPO_PUBLIC_SENTRY_DSN` | Destino público del SDK. |
| `SENTRY_ORG` | Slug de la organización Sentry. |
| `SENTRY_PROJECT` | Slug del proyecto Sentry. |
| `SENTRY_AUTH_TOKEN` | Secreto de EAS con permisos de subida de artefactos de Sentry. |

Inventario por nombre desde PowerShell, sin imprimir los valores que pueda devolver la CLI.

```powershell
$listado = npx eas-cli@latest env:list preview --format short 2>&1
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el entorno preview' }
foreach ($nombre in @('EXPO_PUBLIC_SENTRY_DSN','SENTRY_ORG','SENTRY_PROJECT','SENTRY_AUTH_TOKEN')) {
  $presente = [bool]($listado | Select-String -Pattern ("(^|\s)" + $nombre + "(\s|=|$)"))
  Write-Output "$nombre presente=$presente"
}
Remove-Variable listado
```

En la próxima compilación autorizada, revisar que el plugin de Expo ejecute la subida de artefactos. Comprobar en Sentry que un evento del APK se simbolice con sus líneas TypeScript. El bundle local con Debug ID valida la generación del mapa, mientras que el proyecto Sentry debe confirmar la subida y la resolución real. Mantener el token fuera de las variables públicas y del repositorio.

## Cierres nativos y envío diferido

Expo Go solo permite verificar JavaScript. La captura de cierres nativos sigue desactivada. Antes de activarla, validar en un build Android propio el saneamiento de los eventos que genera el SDK Android. El filtro JavaScript `beforeSend` no debe asumirse como un filtro nativo. Revisar el hook nativo, el filtrado del proyecto Sentry y la eliminación de IP, adjuntos, breadcrumbs y contexto sensible. Verificar también que un error capturado sin red llegue después de reconectar, incluida la opción de cerrar y reabrir la aplicación. Registrar la pantalla con `definirPantallaTelemetria()` usando exclusivamente las etiquetas del contrato de telemetría.

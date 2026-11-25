import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AuthButton, AuthMessage } from '@/features/auth/presentation/AuthForm';
import { obtenerUbicacion, prepararFoto } from '../../data/captura-nativa';
import type { EvidenciaActa, RecintoCaptura } from '../../domain/evidencia';
import { ErrorRegistro } from '../../domain/registro';

type Props = {
  evidencia: EvidenciaActa;
  onChange: (evidencia: EvidenciaActa) => void;
  onBusy: (ocupada: boolean) => void;
  recinto?: RecintoCaptura;
  disabled: boolean;
};

export function CapturaEvidencia({ evidencia, onChange, onBusy, recinto, disabled }: Props) {
  const [permiso, pedirCamara] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const ejecutando = useRef(false);
  const [cargando, setCargando] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const [lista, setLista] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [permisoGpsDenegado, setPermisoGpsDenegado] = useState(false);

  async function ejecutar(tarea: () => Promise<void>) {
    if (ejecutando.current || disabled) return;
    ejecutando.current = true;
    setCargando(true);
    onBusy(true);
    setMensaje(undefined);
    try {
      await tarea();
    } catch (error) {
      setMensaje(error instanceof ErrorRegistro ? error.message : 'No pudimos completar la captura. Puedes guardar el borrador local y reintentar.');
    } finally {
      ejecutando.current = false;
      setCargando(false);
      onBusy(false);
    }
  }

  async function abrir() {
    const respuesta = permiso?.granted ? permiso : await pedirCamara();
    if (!respuesta.granted) {
      setMensaje('Permite el acceso a la cámara para fotografiar el acta.');
      return;
    }
    setLista(false);
    setAbierta(true);
  }

  async function fotografiar() {
    if (!lista || !camara.current) return;
    const capturadaEn = Date.now();
    const foto = await camara.current.takePictureAsync({ quality: 1 });
    setAbierta(false);
    if (!foto) throw new ErrorRegistro('La cámara no entregó una foto. Vuelve a tomarla.');
    const preparada = await prepararFoto(foto, capturadaEn);
    onChange({ ...evidencia, foto: preparada });
  }

  async function ubicar() {
    if (!recinto) return;
    const resultado = await obtenerUbicacion(recinto);
    setPermisoGpsDenegado(resultado.estado === 'permiso-denegado');
    if (resultado.estado === 'obtenida') {
      onChange({ ...evidencia, ubicacion: resultado.ubicacion });
    } else {
      setMensaje(resultado.estado === 'permiso-denegado'
        ? 'Permite la ubicación precisa en los ajustes del dispositivo. Puedes guardar el borrador local.'
        : 'No se obtuvo una ubicación GPS utilizable. Puedes guardar el borrador local y volver a intentarlo.');
    }
  }

  const ubicacion = evidencia.ubicacion;
  return (
    <View style={styles.grupo}>
      <AuthMessage message={mensaje} />
      {abierta ? (
        <>
          <CameraView ref={camara} style={styles.vista} facing="back" mode="picture"
            onCameraReady={() => setLista(true)}
            onMountError={() => { setAbierta(false); setMensaje('No se pudo abrir la cámara. Inténtalo de nuevo.'); }} />
          <AuthButton label="Tomar fotografía" busy={cargando} disabled={!lista || disabled}
            onPress={() => { void ejecutar(fotografiar); }} />
          <AuthButton label="Cerrar cámara" secondary disabled={cargando || disabled} onPress={() => setAbierta(false)} />
        </>
      ) : (
        <>
          {evidencia.foto && <Image accessibilityLabel="Vista previa de la fotografía del acta"
            source={{ uri: 'data:image/jpeg;base64,' + evidencia.foto.jpegBase64 }} cachePolicy="none"
            style={styles.vista} contentFit="contain" />}
          <AuthButton label={evidencia.foto ? 'Repetir fotografía' : 'Abrir cámara'} secondary
            disabled={cargando || disabled} onPress={() => { void ejecutar(abrir); }} />
          {(permisoGpsDenegado || (permiso && !permiso.granted && !permiso.canAskAgain)) && <AuthButton label="Abrir ajustes" secondary
            disabled={cargando || disabled} onPress={() => { void ejecutar(() => Linking.openSettings()); }} />}
          <AuthButton label={ubicacion ? 'Volver a medir ubicación' : 'Obtener ubicación GPS'} secondary
            disabled={cargando || disabled || !recinto} onPress={() => { void ejecutar(ubicar); }} />
          {cargando && <AuthMessage message="Procesando evidencia…" />}
          {!recinto && <AuthMessage message="La ubicación y el margen del recinto no están disponibles." />}
          {ubicacion && <AuthMessage message={
            ubicacion.resultado === 'dentro' ? 'Ubicación dentro del margen del recinto.'
              : ubicacion.resultado === 'fuera' ? 'Ubicación fuera del margen. Requiere revisión al enviar.'
              : 'La precisión no permite confirmar que estés dentro del margen. Vuelve a medir.'
          } />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 10 },
  vista: { width: '100%', height: 280, borderRadius: 12, overflow: 'hidden' },
});

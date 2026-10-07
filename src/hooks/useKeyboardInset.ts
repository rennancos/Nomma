import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type View } from 'react-native';

/**
 * Quanto o teclado cobre da view (`ref`), para encolher o conteúdo em vez de o teclado cortá-lo.
 * No Android 15+ (edge-to-edge) o sistema não redimensiona mais a janela ao abrir o teclado.
 * O KeyboardAvoidingView mede a própria posição relativa ao pai (erra pela altura do cabeçalho);
 * aqui a medida é na janela, a mesma referência das coordenadas do teclado. Vale para celular,
 * tablet, paisagem e telas com ou sem cabeçalho/abas.
 */
export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  useEffect(() => {
    // iOS avisa antes de animar; Android só depois de abrir.
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      ref.current?.measureInWindow((_x, y, _w, height) => setInset(Math.max(0, y + height - e.endCoordinates.screenY)));
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return { ref, inset };
}

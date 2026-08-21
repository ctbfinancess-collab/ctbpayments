import { Alert, Platform } from 'react-native';

// `react-native-web` exporta `Alert.alert` como um no-op (`static alert() {}`)
// — nenhum botão, nenhum callback, nada acontece. Qualquer fluxo que dependa
// do `onPress` de um botão de Alert (navegar, confirmar, cancelar) fica
// travado no Web, mesmo funcionando perfeitamente no app nativo (iOS/Android
// usam o Alert real do sistema). Este módulo substitui `Alert.alert` só na
// Web por uma versão real baseada em `window.alert`/`window.confirm`, que
// efetivamente chama o `onPress` do botão escolhido — sem mudar nada no
// comportamento nativo. É importado uma única vez (App.js) e vale pro app
// inteiro, já que `Alert` é o mesmo objeto compartilhado por todo import.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const list = Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }];
    const text = [title, message].filter(Boolean).join('\n\n');

    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }

    const cancelButton = list.find((button) => button.style === 'cancel') || list[0];
    const confirmButton = list.find((button) => button.style === 'destructive') || list[list.length - 1];
    if (window.confirm(text)) confirmButton?.onPress?.();
    else cancelButton?.onPress?.();
  };
}

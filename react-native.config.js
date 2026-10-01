// Módulos nativos que o expo-router traz como dependência opcional (Drawer e pilha JS),
// mas que o app não usa: usamos Stack nativo (react-native-screens) e Tabs.
// Não linkar evita o build C++ que estoura o limite de 260 caracteres de caminho do Windows
// e reduz o APK. Se um dia usar <Drawer> ou gestos/animações do Reanimated, remova daqui.
const unused = ['react-native-gesture-handler', 'react-native-reanimated', 'react-native-worklets', '@react-native-masked-view/masked-view'];

module.exports = {
  dependencies: Object.fromEntries(unused.map((name) => [name, { platforms: { android: null, ios: null } }])),
};

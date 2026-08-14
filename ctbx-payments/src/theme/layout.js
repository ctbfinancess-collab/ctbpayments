// Largura máxima da "moldura" do app no Expo Web — mantém a proporção visual
// de um celular no navegador em vez de esticar o layout para a tela toda.
// Compartilhada entre App.js (a moldura em si) e useAppWidth (o cálculo de
// layout das telas), para as duas pontas nunca ficarem fora de sincronia.
const layout = {
  webFrameWidth: 430,
  // Proporção largura/altura (convenção do RN `aspectRatio`, igual ao CSS
  // `aspect-ratio: width/height`) de um celular real (~9:19.5), derivada das
  // próprias artes de fundo oficiais (853×1844 — todas nesse mesmo formato).
  // Sem isso a moldura esticava até a altura da janela do navegador em vez
  // de manter formato de celular, distorcendo/espremendo os fundos em
  // desktops com janela mais alta que larga.
  webFrameAspectRatio: 853 / 1844,
};

export default layout;

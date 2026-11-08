'use strict';
/* Lista de materiais sugerida para cada serviço, com preço ESTIMADO (média de lojas de material
   de construção e home centers de Uberaba/MG, nov/2026). É só uma referência: o Pietro pode mudar
   a quantidade e o preço na hora do orçamento. Para atualizar um preço, mude o número aqui. */

// chave: [nome do material, unidade, preço estimado em R$]
const MAT = {
  // Elétrica
  tomada: ['Tomada 10/20 A com placa', 'un', 22],
  interruptor: ['Interruptor simples com placa', 'un', 20],
  fio25: ['Fio flexível 2,5 mm²', 'm', 3.5],
  fio4: ['Fio flexível 4 mm²', 'm', 5.5],
  fio6: ['Fio flexível 6 mm²', 'm', 8.5],
  fita: ['Fita isolante 10 m', 'un', 7],
  conector: ['Conector de emenda tipo Wago', 'un', 4],
  chuveiro: ['Chuveiro elétrico', 'un', 120],
  resistencia: ['Resistência para chuveiro', 'un', 35],
  plafon: ['Plafon / luminária LED', 'un', 60],
  lampada: ['Lâmpada LED 9 W', 'un', 10],
  gancho: ['Gancho / olhal para lustre', 'un', 12],
  ventilador: ['Ventilador de teto', 'un', 280],
  disjuntor: ['Disjuntor DIN 10 a 32 A', 'un', 25],
  canaleta: ['Canaleta 20×10 mm (barra 2 m)', 'barra', 18],
  caixa_sobrepor: ['Caixa de sobrepor para canaleta', 'un', 12],
  campainha: ['Campainha sem fio', 'un', 70],
  fio_campainha: ['Fio paralelo 2×0,5 mm²', 'm', 2],
  // Fixação
  bucha6: ['Bucha 6 mm com parafuso (10 un)', 'kit', 8],
  bucha8: ['Bucha 8 mm com parafuso (10 un)', 'kit', 10],
  bucha10: ['Bucha 10 mm com parafuso (4 un)', 'kit', 10],
  parafuso_madeira: ['Parafusos para madeira (kit)', 'kit', 8],
  // Hidráulica
  torneira: ['Torneira / misturador', 'un', 80],
  flexivel: ['Engate flexível 40 cm', 'un', 15],
  sifao: ['Sifão sanfonado universal', 'un', 18],
  veda_rosca: ['Fita veda-rosca', 'un', 6],
  reparo_valvula: ['Reparo de válvula de descarga', 'un', 45],
  reparo_caixa: ['Kit reparo de caixa acoplada', 'un', 55],
  registro: ['Registro de gaveta/pressão', 'un', 70],
  reparo_registro: ['Reparo (vedante) de registro', 'un', 25],
  cola_pvc: ['Adesivo para PVC 75 g', 'un', 15],
  desentupidor: ['Desentupidor químico', 'un', 18],
  anel_vaso: ['Anel de vedação para vaso', 'un', 15],
  fixacao_vaso: ['Kit de fixação de vaso', 'un', 15],
  vaso: ['Vaso sanitário com caixa acoplada', 'un', 420],
  silicone: ['Silicone (tubo 280 g)', 'un', 28],
  valvula_pia: ['Válvula de escoamento para pia/cuba', 'un', 25],
  refil: ['Refil para filtro/purificador', 'un', 70],
  // Instalações
  suporte_tv: ['Suporte fixo para TV até 55"', 'un', 70],
  suporte_tv_art: ['Suporte articulado para TV', 'un', 160],
  mao_francesa: ['Mão-francesa (par)', 'par', 22],
  prateleira: ['Prateleira MDF 60 cm', 'un', 45],
  varao: ['Varão para cortina com suportes', 'un', 90],
  varal: ['Varal de teto/parede', 'un', 130],
  kit_banheiro: ['Kit de acessórios de banheiro', 'kit', 120],
  barra_apoio: ['Barra de apoio inox 40 cm', 'un', 85],
  camera: ['Câmera Wi-Fi', 'un', 170],
  cartao_sd: ['Cartão microSD 64 GB', 'un', 50],
  // Montagem
  ferragens: ['Parafusos e cavilhas de reposição', 'kit', 12],
  cola_madeira: ['Cola branca para madeira', 'un', 12],
  antitombamento: ['Suporte antitombamento', 'un', 8],
  dobradica_caneco: ['Dobradiça caneco 35 mm', 'un', 9],
  // Pintura
  tinta: ['Tinta acrílica (galão 3,6 L)', 'galão', 95],
  tinta_lata: ['Tinta acrílica (lata 18 L)', 'lata', 360],
  selador: ['Selador acrílico (galão 3,6 L)', 'galão', 70],
  massa: ['Massa corrida (galão 5,6 kg)', 'galão', 45],
  lixa: ['Lixa para parede', 'folha', 2],
  rolo: ['Rolo de lã 23 cm', 'un', 35],
  trincha: ['Trincha 2"', 'un', 15],
  fita_crepe: ['Fita crepe 48 mm', 'un', 14],
  lona: ['Lona plástica 4×5 m', 'un', 25],
  bandeja: ['Bandeja para pintura', 'un', 12],
  esmalte: ['Esmalte sintético (galão 3,6 L)', 'galão', 120],
  fundo_ferro: ['Fundo anticorrosivo 900 ml', 'un', 45],
  aguarras: ['Aguarrás 900 ml', 'un', 25],
  // Portas
  fechadura: ['Fechadura', 'un', 90],
  fechadura_digital: ['Fechadura digital', 'un', 600],
  dobradica: ['Dobradiça 3½"', 'un', 15],
  grafite: ['Grafite em pó', 'un', 12],
  olho_magico: ['Olho mágico', 'un', 25],
  trinco: ['Trinco / ferrolho', 'un', 25],
  lubrificante: ['Lubrificante spray 300 ml', 'un', 35],
  // Manutenção
  agua_sanitaria: ['Água sanitária 2 L', 'un', 10],
  esponja: ['Escova / esponja', 'un', 10],
  sacos: ['Sacos de lixo 100 L (pacote)', 'un', 15],
  rejunte: ['Rejunte 1 kg', 'kg', 12],
  imperm_rejunte: ['Impermeabilizante de rejunte', 'un', 35],
  argamassa: ['Argamassa AC-II 20 kg', 'saco', 28],
  telha: ['Telha cerâmica', 'un', 3.5]
};

// Serviço → materiais sugeridos: [chave, quantidade, multiplica pela quantidade do serviço? (1 = sim, 0 = não)]
const MAT_SERVICO = {
  'Troca de tomada ou interruptor': [['tomada', 1, 1], ['interruptor', 1, 1], ['conector', 2, 1], ['fita', 1, 0]],
  'Tomada/interruptor adicional (mesma visita)': [['tomada', 1, 1], ['interruptor', 1, 1], ['fio25', 3, 1], ['conector', 2, 1]],
  'Instalação de chuveiro elétrico': [['chuveiro', 1, 1], ['fio6', 3, 1], ['conector', 2, 1], ['veda_rosca', 1, 0], ['fita', 1, 0]],
  'Troca de resistência de chuveiro': [['resistencia', 1, 1], ['veda_rosca', 1, 0]],
  'Instalação de luminária ou plafon': [['plafon', 1, 1], ['lampada', 1, 1], ['conector', 2, 1], ['bucha6', 1, 0]],
  'Instalação de lustre grande': [['gancho', 1, 1], ['lampada', 3, 1], ['conector', 2, 1], ['bucha8', 1, 0]],
  'Instalação de ventilador de teto': [['ventilador', 1, 1], ['gancho', 1, 1], ['conector', 3, 1], ['bucha10', 1, 0], ['fita', 1, 0]],
  'Troca de disjuntor': [['disjuntor', 1, 1], ['fio6', 1, 1]],
  'Novo ponto aparente (canaleta)': [['canaleta', 2, 1], ['caixa_sobrepor', 1, 1], ['tomada', 1, 1], ['fio25', 6, 1], ['conector', 2, 1], ['bucha6', 1, 0]],
  'Campainha ou interfone simples': [['campainha', 1, 1], ['fio_campainha', 5, 1], ['bucha6', 1, 0]],

  'Troca de torneira ou misturador': [['torneira', 1, 1], ['flexivel', 1, 1], ['veda_rosca', 1, 0]],
  'Troca de sifão ou engate flexível': [['sifao', 1, 1], ['flexivel', 1, 1], ['veda_rosca', 1, 0]],
  'Reparo de válvula de descarga': [['reparo_valvula', 1, 1], ['veda_rosca', 1, 0]],
  'Reparo de caixa acoplada': [['reparo_caixa', 1, 1], ['flexivel', 1, 1], ['veda_rosca', 1, 0]],
  'Troca ou reparo de registro': [['registro', 1, 1], ['reparo_registro', 1, 1], ['veda_rosca', 1, 0], ['cola_pvc', 1, 0]],
  'Desentupimento de pia ou vaso': [['desentupidor', 1, 1], ['sifao', 1, 0]],
  'Instalação de vaso sanitário': [['vaso', 1, 1], ['anel_vaso', 1, 1], ['fixacao_vaso', 1, 1], ['flexivel', 1, 1], ['silicone', 1, 0], ['veda_rosca', 1, 0]],
  'Instalação de pia, cuba ou tanque': [['valvula_pia', 1, 1], ['sifao', 1, 1], ['flexivel', 1, 1], ['silicone', 1, 0], ['bucha8', 1, 0], ['veda_rosca', 1, 0]],
  'Instalação de filtro ou purificador': [['refil', 1, 1], ['flexivel', 1, 1], ['veda_rosca', 1, 0], ['bucha6', 1, 0]],

  'Suporte de TV até 55"': [['suporte_tv', 1, 1], ['bucha10', 1, 1]],
  'Suporte de TV acima de 55" ou articulado': [['suporte_tv_art', 1, 1], ['bucha10', 2, 1]],
  'Quadro ou espelho': [['bucha6', 1, 0]],
  'Prateleira': [['prateleira', 1, 1], ['mao_francesa', 1, 1], ['bucha8', 1, 0]],
  'Cortina, varão ou persiana': [['varao', 1, 1], ['bucha8', 1, 1]],
  'Varal de teto ou de parede': [['varal', 1, 1], ['bucha8', 1, 1]],
  'Kit de acessórios de banheiro': [['kit_banheiro', 1, 1], ['bucha6', 1, 1]],
  'Barra de apoio (segurança/idosos)': [['barra_apoio', 1, 1], ['bucha10', 1, 1]],
  'Câmera Wi-Fi': [['camera', 1, 1], ['cartao_sd', 1, 1], ['bucha6', 1, 0]],

  'Criado-mudo, cômoda ou rack': [['ferragens', 1, 0], ['antitombamento', 1, 1]],
  'Cama ou beliche': [['ferragens', 1, 0], ['cola_madeira', 1, 0]],
  'Guarda-roupa de 2 a 3 portas': [['ferragens', 1, 1], ['antitombamento', 2, 1], ['dobradica_caneco', 2, 0]],
  'Guarda-roupa casal de 6 portas': [['ferragens', 2, 1], ['antitombamento', 2, 1], ['dobradica_caneco', 2, 0]],
  'Cozinha compacta': [['ferragens', 2, 1], ['bucha8', 2, 1], ['dobradica_caneco', 2, 0]],

  // Pintura por m²: ~40 m² por galão em 2 demãos
  'Pintura de parede': [['tinta', 0.05, 1], ['selador', 0.025, 1], ['massa', 0.02, 1], ['lixa', 0.2, 1], ['rolo', 1, 0], ['trincha', 1, 0], ['fita_crepe', 1, 0], ['lona', 1, 0], ['bandeja', 1, 0]],
  'Cômodo pequeno completo (paredes e teto)': [['tinta_lata', 1, 1], ['selador', 1, 1], ['massa', 1, 1], ['lixa', 10, 1], ['rolo', 1, 0], ['trincha', 1, 0], ['fita_crepe', 2, 1], ['lona', 1, 1], ['bandeja', 1, 0]],
  'Portão ou grade': [['esmalte', 1, 1], ['fundo_ferro', 1, 1], ['aguarras', 1, 1], ['lixa', 5, 1], ['trincha', 1, 0], ['rolo', 1, 0]],
  'Retoques e reparo de massa': [['massa', 1, 1], ['tinta', 1, 1], ['lixa', 5, 1], ['trincha', 1, 0]],

  'Troca de fechadura comum': [['fechadura', 1, 1], ['parafuso_madeira', 1, 0]],
  'Instalação de fechadura digital': [['fechadura_digital', 1, 1], ['parafuso_madeira', 1, 0]],
  'Ajuste de porta que arrasta': [['parafuso_madeira', 1, 0], ['lubrificante', 1, 0], ['lixa', 2, 1]],
  'Troca de dobradiças': [['dobradica', 3, 1], ['parafuso_madeira', 1, 1]],
  'Olho mágico ou trinco extra': [['olho_magico', 1, 1], ['trinco', 1, 1]],

  "Limpeza de caixa d'água até 1.000 L": [['agua_sanitaria', 1, 1], ['esponja', 1, 1]],
  'Limpeza de calhas': [['sacos', 1, 1]],
  'Refazer rejunte de box ou banheiro': [['rejunte', 3, 1], ['imperm_rejunte', 1, 1], ['esponja', 1, 0]],
  'Troca de silicone de pia ou box': [['silicone', 1, 1]],
  'Recolocar azulejo ou piso solto': [['argamassa', 1, 0], ['rejunte', 1, 1]],
  'Troca de telhas quebradas': [['telha', 10, 1]]
};

// Serviço criado pelo Pietro (fora da lista acima): sugestão básica pela categoria
const MAT_CATEGORIA = {
  'Elétrica': [['fita', 1, 0], ['conector', 2, 1], ['fio25', 3, 1]],
  'Hidráulica': [['veda_rosca', 1, 0], ['flexivel', 1, 1], ['silicone', 1, 0]],
  'Instalações': [['bucha8', 1, 1]],
  'Montagem': [['ferragens', 1, 1]],
  'Pintura': [['tinta', 1, 1], ['rolo', 1, 0], ['lixa', 5, 1]],
  'Portas': [['parafuso_madeira', 1, 0], ['lubrificante', 1, 0]],
  'Manutenção': [['silicone', 1, 0]]
};

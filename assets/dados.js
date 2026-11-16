/* Base de demonstração da Procar. Fica só no navegador (localStorage).
   Site e painel leem e gravam a mesma base, então um agendamento feito
   no site aparece na agenda do painel. */
(function () {
  const CHAVE = 'procar_db_v3';
  const ETAPAS = [
    { id: 'recebido', nome: 'Recebido', curto: 'Recebido' },
    { id: 'diagnostico', nome: 'Em diagnóstico', curto: 'Diagnóstico' },
    { id: 'aprovacao', nome: 'Aguardando aprovação', curto: 'Aprovação' },
    { id: 'servico', nome: 'Em serviço', curto: 'Serviço' },
    { id: 'teste', nome: 'Teste de temperatura', curto: 'Teste' },
    { id: 'pronto', nome: 'Pronto para retirada', curto: 'Pronto' }
  ];
  const SERVICOS = [
    { id: 'avaliacao', nome: 'Avaliação completa do sistema', tempo: '40 min', retorno: 0 },
    { id: 'higienizacao', nome: 'Higienização com oxi-sanitização', tempo: '1h', retorno: 180 },
    { id: 'filtro', nome: 'Troca do filtro de cabine', tempo: '20 min', retorno: 180 },
    { id: 'carga', nome: 'Carga de gás com teste de vazamento', tempo: '1h30', retorno: 365 },
    { id: 'compressor', nome: 'Reparo ou troca de compressor', tempo: '1 a 2 dias', retorno: 365 },
    { id: 'condensador', nome: 'Condensador, evaporador e mangueiras', tempo: '1 dia', retorno: 365 },
    { id: 'eletrica', nome: 'Parte elétrica e painel de comando', tempo: 'sob avaliação', retorno: 0 },
    { id: 'instalacao', nome: 'Instalação de ar em carro que não tem', tempo: '2 a 3 dias', retorno: 365 }
  ];

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = n => { const d = new Date(hoje); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  function semente() {
    const clientes = [
      ['c1', 'Marcos Vinícius Teles', '71 98812-4410', 'Instagram'],
      ['c2', 'Patrícia Almeida', '71 99130-2275', 'Indicação'],
      ['c3', 'Transportes Rio Vermelho (frota)', '71 3245-8890', 'Frota'],
      ['c4', 'Diego Santana', '71 98701-6632', 'Google'],
      ['c5', 'Fernanda Rocha', '71 99254-1180', 'Passou na porta'],
      ['c6', 'Ricardo Menezes', '71 98455-0917', 'Indicação'],
      ['c7', 'Luana Prado', '71 99677-3304', 'Google'],
      ['c8', 'Edson Carvalho (motorista de app)', '71 98140-2251', 'Instagram'],
      ['c9', 'Juliana Matos', '71 99902-7745', 'Indicação'],
      ['c10', 'Clínica Ondina (frota)', '71 3332-1040', 'Frota'],
      ['c11', 'Bruno Lacerda', '71 98833-5521', 'Google'],
      ['c12', 'Camila Reis', '71 99714-0086', 'Indicação'],
      ['c13', 'Thiago Barreto (motorista de app)', '71 98266-7319', 'Instagram'],
      ['c14', 'Renata Pires', '71 99381-4402', 'Passou na porta']
    ].map(([id, nome, fone, origem]) => ({ id, nome: nome + ' (exemplo)', fone, origem }));

    const veiculos = [
      ['v1', 'c1', 'RPX3A21', 'Toyota Corolla XEi', 2019, 'R-134a'],
      ['v2', 'c2', 'PKM8C04', 'Jeep Compass Longitude', 2021, 'R-1234yf'],
      ['v3', 'c3', 'QTA1F55', 'Fiat Fiorino', 2018, 'R-134a'],
      ['v4', 'c3', 'QTA2B10', 'Renault Master', 2020, 'R-134a'],
      ['v5', 'c4', 'OUZ4D87', 'Honda Civic EXL', 2017, 'R-134a'],
      ['v6', 'c5', 'SBE6H12', 'Hyundai HB20', 2022, 'R-134a'],
      ['v7', 'c6', 'RQC0J33', 'BMW 320i', 2019, 'R-1234yf'],
      ['v8', 'c7', 'PJL5E90', 'VW T-Cross', 2021, 'R-134a'],
      ['v9', 'c8', 'RTF7K48', 'Chevrolet Onix Plus', 2020, 'R-134a'],
      ['v10', 'c9', 'NZA2G61', 'Nissan Kicks', 2018, 'R-134a'],
      ['v11', 'c10', 'SAX9L02', 'Toyota Hilux SRV', 2022, 'R-134a'],
      ['v12', 'c6', 'OKT3M77', 'Mercedes-Benz C180', 2016, 'R-134a'],
      ['v13', 'c11', 'PJQ6A44', 'Fiat Toro Volcano', 2021, 'R-134a'],
      ['v14', 'c12', 'RTA9C15', 'Toyota Yaris XLS', 2022, 'R-134a'],
      ['v15', 'c13', 'SBN3D70', 'Chevrolet Spin LTZ', 2019, 'R-134a'],
      ['v16', 'c14', 'OUK1E28', 'Peugeot 2008 Griffe', 2020, 'R-134a']
    ].map(([id, cliente, placa, modelo, ano, gas]) => ({ id, cliente, placa, modelo, ano, gas }));

    const it = (desc, tipo, valor) => ({ desc, tipo, valor });
    const os = [
      { id: 'OS-2611', veiculo: 'v1', etapa: 'aprovacao', entrada: dia(0), previsao: dia(1), queixa: 'Não gela, só sai vento quente depois de 20 minutos ligado.',
        tecnico: 'Anderson', baixa: 18, alta: 140, saidaAntes: 22, saidaDepois: null,
        diagnostico: 'Vazamento na válvula de serviço de alta e embreagem do compressor patinando quando aquece.',
        itens: [it('Válvula de serviço (alta)', 'peça', 85), it('Embreagem eletromagnética do compressor', 'peça', 620), it('Carga de gás R-134a (650 g) + óleo PAG', 'peça', 210), it('Mão de obra', 'mão de obra', 280)], aprovado: false },
      { id: 'OS-2610', veiculo: 'v7', etapa: 'servico', entrada: dia(-1), previsao: dia(1), queixa: 'Cheiro de mofo e vento fraco.',
        tecnico: 'Anderson', baixa: 30, alta: 210, saidaAntes: 9, saidaDepois: null,
        diagnostico: 'Filtro de cabine saturado e caixa evaporadora com acúmulo de sujeira.',
        itens: [it('Filtro de cabine com carvão ativado', 'peça', 160), it('Higienização da caixa evaporadora', 'mão de obra', 220)], aprovado: true },
      { id: 'OS-2609', veiculo: 'v3', etapa: 'diagnostico', entrada: dia(0), previsao: dia(2), queixa: 'Frota: ar desarmando no trânsito.',
        tecnico: 'Rafael', baixa: null, alta: null, saidaAntes: null, saidaDepois: null, diagnostico: '', itens: [], aprovado: false },
      { id: 'OS-2608', veiculo: 'v9', etapa: 'teste', entrada: dia(-1), previsao: dia(0), queixa: 'Barulho ao ligar o ar.',
        tecnico: 'Rafael', baixa: 32, alta: 205, saidaAntes: 14, saidaDepois: 5,
        diagnostico: 'Rolamento da polia do compressor com folga.',
        itens: [it('Rolamento da polia', 'peça', 140), it('Mão de obra', 'mão de obra', 180)], aprovado: true },
      { id: 'OS-2607', veiculo: 'v2', etapa: 'pronto', entrada: dia(-2), previsao: dia(0), queixa: 'Revisão antes de viagem.',
        tecnico: 'Anderson', baixa: 31, alta: 200, saidaAntes: 8, saidaDepois: 4,
        diagnostico: 'Sistema ok. Feita higienização e troca do filtro.',
        itens: [it('Filtro de cabine', 'peça', 120), it('Higienização', 'mão de obra', 180)], aprovado: true },
      { id: 'OS-2606', veiculo: 'v11', etapa: 'recebido', entrada: dia(0), previsao: dia(1), queixa: 'Frota: manutenção preventiva trimestral.',
        tecnico: '', baixa: null, alta: null, saidaAntes: null, saidaDepois: null, diagnostico: '', itens: [], aprovado: false },
      { id: 'OS-2605', veiculo: 'v12', etapa: 'aprovacao', entrada: dia(-1), previsao: dia(2), queixa: 'Ar gela e para de gelar.',
        tecnico: 'Rafael', baixa: 8, alta: 95, saidaAntes: 18, saidaDepois: null,
        diagnostico: 'Compressor sem rendimento (válvula de controle). Recomendada troca.',
        itens: [it('Compressor remanufaturado com garantia', 'peça', 1850), it('Filtro secador', 'peça', 160), it('Limpeza do sistema (flushing)', 'mão de obra', 250), it('Carga de gás + óleo', 'peça', 230), it('Mão de obra', 'mão de obra', 450)], aprovado: false }
    ];

    // histórico: serviços já entregues (alimenta relatórios e retornos)
    const servs = ['higienizacao', 'carga', 'filtro', 'compressor', 'higienizacao', 'carga', 'condensador', 'higienizacao', 'filtro', 'avaliacao'];
    const historico = [];
    let n = 2400;
    for (let m = 5; m >= 0; m--) {
      const qtd = [14, 17, 21, 26, 31, 19][5 - m];
      for (let k = 0; k < qtd; k++) {
        const v = veiculos[(k * 7 + m) % 12];
        const s = servs[(k + m) % servs.length];
        const base = { avaliacao: 120, higienizacao: 260, filtro: 140, carga: 390, compressor: 2300, condensador: 1150 }[s];
        const d = new Date(hoje); d.setMonth(d.getMonth() - m); d.setDate(1 + (k * 3) % 27);
        if (d > hoje) d.setDate(hoje.getDate() - 1);
        historico.push({ id: 'OS-' + (n++), veiculo: v.id, servico: s, data: d.toISOString().slice(0, 10), valor: base + ((k * 37) % 120) });
      }
    }
    // retornos que vencem nesta semana
    historico.push({ id: 'OS-2120', veiculo: 'v5', servico: 'higienizacao', data: dia(-178), valor: 260 });
    historico.push({ id: 'OS-2121', veiculo: 'v6', servico: 'higienizacao', data: dia(-183), valor: 260 });
    historico.push({ id: 'OS-2122', veiculo: 'v8', servico: 'filtro', data: dia(-190), valor: 140 });
    historico.push({ id: 'OS-1980', veiculo: 'v10', servico: 'carga', data: dia(-362), valor: 390 });
    historico.push({ id: 'OS-2101', veiculo: 'v13', servico: 'higienizacao', data: dia(-185), valor: 260 });
    historico.push({ id: 'OS-2133', veiculo: 'v14', servico: 'higienizacao', data: dia(-176), valor: 260 });
    historico.push({ id: 'OS-2140', veiculo: 'v15', servico: 'filtro', data: dia(-174), valor: 140 });
    historico.push({ id: 'OS-1995', veiculo: 'v16', servico: 'carga', data: dia(-350), valor: 410 });
    historico.push({ id: 'OS-2160', veiculo: 'v16', servico: 'higienizacao', data: dia(-165), valor: 260 });

    const agendamentos = [
      { id: 'AG-501', data: dia(0), periodo: 'manhã', nome: 'Diego Santana (exemplo)', fone: '71 98701-6632', placa: 'OUZ4D87', modelo: 'Honda Civic 2017', servico: 'higienizacao', sintoma: 'Cheiro ruim', origem: 'site', status: 'confirmado' },
      { id: 'AG-502', data: dia(0), periodo: 'tarde', nome: 'Luana Prado (exemplo)', fone: '71 99677-3304', placa: 'PJL5E90', modelo: 'VW T-Cross 2021', servico: 'avaliacao', sintoma: 'Não gela', origem: 'WhatsApp', status: 'confirmado' },
      { id: 'AG-503', data: dia(1), periodo: 'manhã', nome: 'Juliana Matos (exemplo)', fone: '71 99902-7745', placa: 'NZA2G61', modelo: 'Nissan Kicks 2018', servico: 'carga', sintoma: 'Gela pouco', origem: 'site', status: 'novo' },
      { id: 'AG-504', data: dia(2), periodo: 'manhã', nome: 'Clínica Ondina (exemplo)', fone: '71 3332-1040', placa: 'SAX9L02', modelo: 'Toyota Hilux 2022', servico: 'higienizacao', sintoma: 'Preventiva da frota', origem: 'telefone', status: 'confirmado' },
      { id: 'AG-505', data: dia(3), periodo: 'tarde', nome: 'Fernanda Rocha (exemplo)', fone: '71 99254-1180', placa: 'SBE6H12', modelo: 'Hyundai HB20 2022', servico: 'filtro', sintoma: 'Vento fraco', origem: 'site', status: 'novo' }
    ];

    const estoque = [
      { id: 'e1', item: 'Gás R-134a', un: 'kg', qtd: 9.4, min: 6, custo: 68 },
      { id: 'e2', item: 'Gás R-1234yf', un: 'kg', qtd: 1.8, min: 3, custo: 420 },
      { id: 'e3', item: 'Óleo PAG 46', un: 'frasco', qtd: 7, min: 4, custo: 45 },
      { id: 'e4', item: 'Óleo PAG 100', un: 'frasco', qtd: 2, min: 4, custo: 45 },
      { id: 'e5', item: 'Filtro de cabine (linha VW/Fiat/GM)', un: 'un', qtd: 18, min: 10, custo: 38 },
      { id: 'e6', item: 'Filtro de cabine com carvão ativado', un: 'un', qtd: 6, min: 6, custo: 72 },
      { id: 'e7', item: 'Filtro secador universal', un: 'un', qtd: 5, min: 3, custo: 64 },
      { id: 'e8', item: 'Válvula de expansão (bloco)', un: 'un', qtd: 3, min: 2, custo: 110 },
      { id: 'e9', item: 'Compressor remanufaturado Denso 10S', un: 'un', qtd: 1, min: 1, custo: 1150 },
      { id: 'e10', item: 'Oxi-sanitizador (cartucho)', un: 'un', qtd: 11, min: 8, custo: 22 },
      { id: 'e11', item: 'Corante UV para vazamento', un: 'frasco', qtd: 4, min: 2, custo: 35 }
    ];


    // ---- cadastro completo, equipe e vistoria (dados de exemplo) ----
    const equipe = [
      { id: 'f1', nome: 'Anderson', funcao: 'Técnico de refrigeração' },
      { id: 'f2', nome: 'Rafael', funcao: 'Técnico eletricista' },
      { id: 'f3', nome: 'Thianá', funcao: 'Gerente comercial' }
    ];
    const cpfDe = n => { // CPF fictício com dígitos verificadores válidos
      const b = String(100000000 + n * 7919 % 899999999).slice(0, 9).split('').map(Number);
      const dv = a => { const r = a.reduce((t, d, i) => t + d * (a.length + 1 - i), 0) * 10 % 11; return r === 10 ? 0 : r; };
      const d1 = dv(b), d2 = dv([...b, d1]); const t = b.join('') + d1 + d2;
      return t.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };
    const RUAS = [['Rua Caetano Moura', 'Federação', '40210-341'], ['Av. Cardeal da Silva', 'Federação', '40231-305'], ['Rua Marquês de Monte Santo', 'Rio Vermelho', '41940-330'], ['Av. Oceânica', 'Ondina', '40170-010'], ['Rua Waldemar Falcão', 'Brotas', '40296-710'], ['Av. Garibaldi', 'Ondina', '40170-130'], ['Rua Amazonas', 'Pituba', '41830-380']];
    clientes.forEach((c, i) => {
      const pj = c.origem === 'Frota';
      const r = RUAS[i % RUAS.length];
      Object.assign(c, {
        tipo: pj ? 'pj' : 'pf', doc: pj ? '' : cpfDe(i + 3), fantasia: '',
        email: pj ? '' : c.nome.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(' ').slice(0, 2).join('.') + '@exemplo.com',
        cep: r[2], endereco: r[0], numero: String(40 + i * 37), bairro: r[1], cidade: 'Salvador', uf: 'BA'
      });
    });
    const CORES = ['Prata', 'Branco', 'Preto', 'Cinza', 'Vermelho', 'Azul'];
    const WMI = { Toyota: '9BR', Jeep: '988', Fiat: '9BD', Renault: '93Y', Honda: '93H', Hyundai: '9BH', BMW: 'WBA', VW: '9BW', Chevrolet: '9BG', Nissan: '94D', 'Mercedes-Benz': 'WDD', Peugeot: '936' };
    veiculos.forEach((v, i) => {
      const marca = v.modelo.split(' ')[0];
      const serie = (v.placa + 'KT' + String(100000 + i * 48271 % 899999)).replace(/[IOQ]/g, 'X');
      Object.assign(v, { anoModelo: v.ano + (i % 2), cor: CORES[i % CORES.length], km: 18000 + (i * 13337) % 90000, combustivel: i % 5 === 2 ? 'Diesel' : 'Flex', chassi: ((WMI[marca] || '9BX') + serie).slice(0, 17) });
    });
    const itensOk = { estepe: true, macaco: true, chave: true, triangulo: true, tapetes: true, som: true, manual: false, documento: true };
    os.forEach((o, i) => { o.responsavel = o.tecnico; o.genius = ''; o.nf = ''; o.vistoria = null; });
    const porId = id => os.find(o => o.id === id);
    porId('OS-2611').vistoria = { feita: true, por: 'Thianá', hora: '08:42', combustivel: 2, km: 61480, itens: { ...itensOk }, luzes: [], pertences: 'Cadeirinha infantil no banco de trás.', obs: '',
      marcas: [{ x: 262, y: 214, tipo: 'risco', obs: 'Risco fino, cerca de 10 cm' }, { x: 118, y: 62, tipo: 'pintura', obs: 'Tom diferente do restante' }],
      assinatura: [[30, 78, 52, 40, 70, 84, 92, 36, 112, 80, 128, 58, 150, 74, 176, 52, 196, 76], [205, 60, 240, 56, 282, 66, 330, 52]], fotos: {} };
    porId('OS-2610').vistoria = { feita: true, por: 'Anderson', hora: '15:10', combustivel: 3, km: 43210, itens: { ...itensOk, manual: true }, luzes: [], pertences: '', obs: 'Sem avarias aparentes.', marcas: [],
      assinatura: [[40, 70, 66, 44, 90, 82, 120, 40, 150, 76, 190, 58, 240, 70]], fotos: {} };
    porId('OS-2605').vistoria = { feita: true, por: 'Rafael', hora: '10:05', combustivel: 1, km: 98730, itens: { ...itensOk, tapetes: false }, luzes: ['Injeção'], pertences: 'Óculos de sol no console.', obs: '',
      marcas: [{ x: 452, y: 150, tipo: 'amassado', obs: 'Tampa do porta-malas' }],
      assinatura: [[36, 66, 70, 50, 96, 80, 130, 46, 170, 78, 210, 54, 262, 72]], fotos: {} };
    porId('OS-2610').genius = '18422'; porId('OS-2607').genius = '18419'; porId('OS-2607').nf = 'emitida';

    return { clientes, veiculos, os, historico, agendamentos, estoque, equipe, contatados: {} };
  }

  function carregar() {
    try {
      const s = localStorage.getItem(CHAVE);
      if (s) return JSON.parse(s);
    } catch (e) { }
    const db = semente(); salvar(db); return db;
  }
  function salvar(db) { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { } }

  window.Procar = {
    ETAPAS, SERVICOS, carregar, salvar,
    reset() { try { localStorage.removeItem(CHAVE); } catch (e) { } return carregar(); },
    dia, hoje,
    servico: id => SERVICOS.find(s => s.id === id) || { nome: id },
    reais: v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    data: s => { const [a, m, d] = s.split('-'); return d + '/' + m; },
    whats: '5571986991542',
    placa: p => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  };
})();

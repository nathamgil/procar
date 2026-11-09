(function () {
  const P = window.Procar;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // menu celular
  $('#menu').addEventListener('click', e => {
    const n = $('#nav'); n.classList.toggle('aberto');
    e.target.setAttribute('aria-expanded', n.classList.contains('aberto'));
  });
  $('#nav').addEventListener('click', e => { if (e.target.tagName === 'A') $('#nav').classList.remove('aberto'); });

  // aparecer ao rolar
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.revela').forEach(el => io.observe(el));
  // garantia: nada fica escondido se o navegador não disparar o observador
  setTimeout(() => document.querySelectorAll('.revela').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 1.5) el.classList.add('vis'); }), 1200);
  addEventListener('scroll', () => document.querySelectorAll('.revela:not(.vis)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('vis'); }), { passive: true });

  // manômetros do topo
  function ponteiro(id, arco, val, max, rotulo, txt) {
    const f = Math.min(val / max, 1);
    $(id).style.transform = `rotate(${-90 + 180 * f}deg)`;
    const a = $(arco); a.style.transition = 'stroke-dashoffset 1.8s ease'; a.setAttribute('stroke-dashoffset', 151 - 151 * f);
    let t0 = null;
    const passo = ts => { t0 = t0 || ts; const k = Math.min((ts - t0) / 1600, 1); $(rotulo).textContent = Math.round(val * k) + ' ' + txt; if (k < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  }
  setTimeout(() => {
    ponteiro('#agB', '#arcB', 32, 100, '#vB', 'psi');
    ponteiro('#agA', '#arcA', 210, 350, '#vA', 'psi');
    let t = 24.0;
    const desce = setInterval(() => {
      t -= 0.4; if (t <= 4.2) { t = 4.2; clearInterval(desce); $('#tMeta').textContent = 'dentro da meta ✓'; }
      $('#tSaida').textContent = t.toFixed(1).replace('.', ',') + '°';
    }, 60);
  }, 500);

  // fita com texto que anda com a rolagem + termômetro
  const linhas = [...document.querySelectorAll('.fita .linha')];
  linhas.forEach(l => { l.innerHTML = l.innerHTML.repeat(3); });
  function rolagem() {
    const y = window.scrollY;
    linhas.forEach(l => { const w = l.scrollWidth / 3 || 1, o = (y * 0.35) % w; l.style.transform = `translateX(${+l.dataset.dir > 0 ? o - w : -o}px)`; });
    const max = document.documentElement.scrollHeight - innerHeight;
    const f = max > 0 ? Math.min(y / max, 1) : 0;
    const graus = Math.round(38 - f * 34);
    $('#grau').textContent = graus + '°';
    $('#nivel').style.height = (100 - f * 80) + '%';
    $('#bulbo').style.background = f > .5 ? 'var(--azul)' : 'var(--vermelho)';
  }
  addEventListener('scroll', rolagem, { passive: true }); rolagem();

  // diagnóstico por sintoma
  const SINT = [
    { s: 'Não gela nada, só sai vento', u: 'alta', t: 'Sistema provavelmente sem gás ou compressor sem acionar',
      c: ['Vazamento de gás (mangueira, conexão, válvula ou condensador furado)', 'Embreagem do compressor não está acoplando', 'Fusível, relé ou sensor de pressão impedindo o compressor de ligar'],
      sv: 'avaliacao', d: 'Rodar com o sistema vazio pode danificar o compressor, que é a peça mais cara do circuito.' },
    { s: 'Gela pouco ou demora a gelar', u: 'media', t: 'Rendimento abaixo do normal',
      c: ['Carga de gás abaixo do ideal (pequeno vazamento ao longo do tempo)', 'Condensador sujo ou ventoinha fraca', 'Filtro de cabine entupido reduzindo o vento'],
      sv: 'carga', d: 'Antes de completar o gás, a Procar faz o teste de vazamento. Completar sem achar o furo é o famoso paliativo.' },
    { s: 'Gela e depois para de gelar', u: 'media', t: 'Ciclo irregular do compressor ou congelamento',
      c: ['Evaporador congelando por umidade no sistema', 'Válvula de controle do compressor falhando', 'Sensor de temperatura do evaporador com defeito'],
      sv: 'compressor', d: 'É um dos defeitos que mais confundem. A leitura dos manômetros com o carro ligado mostra a causa.' },
    { s: 'Cheiro ruim quando liga o ar', u: 'baixa', t: 'Fungos e bactérias na caixa evaporadora',
      c: ['Filtro de cabine vencido', 'Umidade acumulada no evaporador', 'Dreno entupido segurando água'],
      sv: 'higienizacao', d: 'Não é só desconforto: quem tem rinite ou alergia sente primeiro. O ideal é higienizar a cada 6 meses.' },
    { s: 'Barulho ao ligar o ar', u: 'alta', t: 'Desgaste mecânico no compressor ou na polia',
      c: ['Rolamento da polia do compressor com folga', 'Embreagem do compressor gasta', 'Correia ressecada ou tensionador fraco'],
      sv: 'compressor', d: 'Barulho costuma avisar antes de travar. Trocar o rolamento agora sai bem mais barato do que o compressor depois.' },
    { s: 'Pinga água dentro do carro', u: 'media', t: 'Dreno do evaporador entupido',
      c: ['Mangueira de dreno obstruída ou solta', 'Sujeira acumulada na caixa evaporadora', 'Vedação da caixa danificada'],
      sv: 'higienizacao', d: 'Água no assoalho causa mofo e pode atingir módulos eletrônicos que ficam embaixo do tapete.' },
    { s: 'Vento fraco nas saídas', u: 'baixa', t: 'Passagem de ar obstruída',
      c: ['Filtro de cabine saturado', 'Motor do ventilador (ventilador interno) perdendo força', 'Resistor de velocidades com defeito'],
      sv: 'filtro', d: 'Muitas vezes resolve com a troca do filtro, que leva uns 20 minutos.' }
  ];
  const sintEl = $('#sintomas');
  sintEl.innerHTML = SINT.map((x, i) => `<button class="sintoma" type="button" aria-pressed="${i === 0}" data-i="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${esc(x.s)}</button>`).join('');
  function laudo(i) {
    const x = SINT[i], sv = P.servico(x.sv);
    const nomeU = { alta: 'Urgência alta', media: 'Urgência média', baixa: 'Pode programar' }[x.u];
    $('#laudo').innerHTML = `
      <div class="topo-l"><div><span class="rot">Possível diagnóstico</span><h3>${esc(x.t)}</h3></div><span class="urg ${x.u}">${nomeU}</span></div>
      <span class="rot v">Causas mais comuns</span>
      <ol>${x.c.map(c => `<li><span>${esc(c)}</span></li>`).join('')}</ol>
      <p style="margin-bottom:18px">${esc(x.d)}</p>
      <div class="serv"><div><small>Serviço indicado</small><b>${esc(sv.nome)}</b></div><a class="btn prim peq" href="#agendar" data-ag="${x.sv}" data-sint="${esc(x.s)}">Agendar com esse sintoma →</a></div>
      <p class="aviso">Orientação geral com base nos casos que mais chegam à oficina. Quem confirma é a avaliação com os manômetros.</p>`;
  }
  sintEl.addEventListener('click', e => {
    const b = e.target.closest('.sintoma'); if (!b) return;
    sintEl.querySelectorAll('.sintoma').forEach(x => x.setAttribute('aria-pressed', x === b));
    laudo(+b.dataset.i);
  });
  laudo(0);
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-ag]'); if (!a) return;
    $('#selServ').value = a.dataset.ag; $('#inSint').value = a.dataset.sint || '';
  });

  // tabela de serviços
  const QUANDO = {
    avaliacao: 'Qualquer sintoma estranho, ou antes de viajar',
    higienizacao: 'A cada 6 meses ou quando aparecer cheiro',
    filtro: 'A cada 6 meses ou 10 mil km',
    carga: 'Quando o ar gela pouco (sempre com teste de vazamento)',
    compressor: 'Barulho, ar que não aciona ou que para de gelar',
    condensador: 'Vazamento, batida na frente ou mangueira ressecada',
    eletrica: 'Painel sem resposta, ventilador com uma velocidade só',
    instalacao: 'Carro que saiu de fábrica sem ar-condicionado'
  };
  $('#tabServ').insertAdjacentHTML('beforeend', P.SERVICOS.map((s, i) => `
    <div class="lin"><span class="i">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.nome)}</h3><p>${esc(QUANDO[s.id])}</p><span class="t">${esc(s.tempo)}</span><a href="#agendar" data-ag="${s.id}">Agendar →</a></div>`).join(''));

  // circuito do sistema
  const ETAPAS = [
    ['Compressor', 'O coração do sistema. Comprime o gás que chega frio e em baixa pressão e o manda quente e em alta pressão. Pode ser alternativo (pistões) ou rotativo tipo scroll.'],
    ['Condensador', 'Fica na frente do radiador. O vento tira o calor do gás, que vira líquido. Sujeira ou batida aqui derrubam o rendimento.'],
    ['Filtro secador', 'Segura umidade e impurezas. Toda vez que o sistema é aberto, ele deve ser trocado.'],
    ['Válvula de expansão', 'Faz a pressão cair de uma vez. É aqui que o gás fica gelado de verdade.'],
    ['Evaporador', 'Fica escondido atrás do painel. O ar da cabine passa por ele, esfria e sai pelas saídas. É onde se acumulam fungos e o cheiro ruim.']
  ];
  const etEl = $('#etapas');
  etEl.innerHTML = ETAPAS.map(([t, p], i) => `<button class="etapa${i === 0 ? ' on' : ''}" type="button" data-k="${i}"><span class="k">ETAPA ${String(i + 1).padStart(2, '0')}</span><h3>${t}</h3><p>${p}</p></button>`).join('');
  function liga(k) {
    etEl.querySelectorAll('.etapa').forEach(e => e.classList.toggle('on', +e.dataset.k === k));
    document.querySelectorAll('.comp-g').forEach(g => g.querySelector('.comp').classList.toggle('on', +g.dataset.k === k));
  }
  etEl.addEventListener('click', e => { const b = e.target.closest('.etapa'); if (b) liga(+b.dataset.k); });
  document.querySelectorAll('.comp-g').forEach(g => { g.style.cursor = 'pointer'; g.addEventListener('click', () => liga(+g.dataset.k)); });
  liga(0);

  // agendamento
  $('#selServ').innerHTML = P.SERVICOS.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('');
  const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const diasL = [];
  for (let n = 0; diasL.length < 10; n++) { const d = new Date(P.hoje); d.setDate(d.getDate() + n); if (d.getDay() !== 0) diasL.push(d); }
  let diaSel = 0, perSel = 'manhã';
  $('#dias').innerHTML = diasL.map((d, i) => `<button type="button" aria-pressed="${i === 0}" data-i="${i}"><small>${i === 0 ? 'hoje' : SEM[d.getDay()]}</small><b>${d.getDate()}</b></button>`).join('');
  $('#dias').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; diaSel = +b.dataset.i; $('#dias').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#per').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; perSel = b.dataset.p; $('#per').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#formAg').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), v = Object.fromEntries(f);
    const falta = ['nome', 'fone', 'placa'].filter(k => !String(v[k] || '').trim());
    e.target.querySelectorAll('input').forEach(i => i.style.borderColor = falta.includes(i.name) ? 'var(--vermelho)' : '');
    if (falta.length) return;
    const db = P.carregar();
    const id = 'AG-' + (500 + db.agendamentos.length + 1);
    const data = diasL[diaSel].toISOString().slice(0, 10);
    db.agendamentos.push({ id, data, periodo: perSel, nome: v.nome, fone: v.fone, placa: P.placa(v.placa), modelo: v.modelo, servico: v.servico, sintoma: v.sintoma, origem: 'site', status: 'novo' });
    P.salvar(db);
    const msg = encodeURIComponent(`Olá, Procar! Pedi agendamento pelo site (${id}).\n${P.servico(v.servico).nome}\nPlaca ${P.placa(v.placa)} · ${P.data(data)} de ${perSel}`);
    const ok = $('#okAg'); ok.classList.add('on');
    ok.innerHTML = `<h4>Pedido recebido</h4><p>Protocolo <span class="proto">${id}</span> · ${P.data(data)}, ${perSel}. A Procar confirma o horário pelo WhatsApp.</p><a class="btn prim peq" style="margin-top:12px" target="_blank" rel="noopener" href="https://wa.me/${P.whats}?text=${msg}">Enviar confirmação no WhatsApp →</a>`;
    e.target.querySelector('button[type=submit]').textContent = 'Pedir outro agendamento';
    e.target.reset();
  });

  // acompanhar pela placa
  function mostraOS(placa) {
    const db = P.carregar(), p = P.placa(placa);
    const v = db.veiculos.find(x => x.placa === p);
    const os = v && db.os.find(o => o.veiculo === v.id);
    const box = $('#resOS');
    if (!os) { box.innerHTML = `<div class="os-card"><div class="vazio">Nenhuma ordem de serviço aberta para <b class="mono">${esc(p || '—')}</b>.<br>Se você deixou o carro hoje, a OS aparece assim que o técnico registrar a entrada.</div></div>`; return; }
    const iE = P.ETAPAS.findIndex(e => e.id === os.etapa);
    const tot = os.itens.reduce((a, b) => a + b.valor, 0);
    const med = (x, u) => x == null ? '—' : x + u;
    box.innerHTML = `<div class="os-card">
      <div class="cab-os"><div><small>${os.id} · ENTRADA ${P.data(os.entrada)}</small><br><b>${esc(v.modelo)} ${v.ano}</b></div><div style="text-align:right"><small>PLACA</small><br><b class="mono">${v.placa}</b></div></div>
      <ol class="trilha">${P.ETAPAS.map((e, i) => `<li class="${i < iE ? 'feito' : i === iE ? 'agora' : ''}">${e.curto}</li>`).join('')}</ol>
      <div class="os-corpo">
        <div><span class="rot v">${esc(P.ETAPAS[iE].nome)}</span><p style="margin-top:6px">${os.diagnostico ? esc(os.diagnostico) : 'O técnico está fazendo a avaliação. A leitura aparece aqui assim que terminar.'}</p></div>
        <div class="medidas"><div><small>Pressão baixa</small><b>${med(os.baixa, ' psi')}</b></div><div><small>Pressão alta</small><b>${med(os.alta, ' psi')}</b></div><div><small>Saída do ar</small><b>${med(os.saidaDepois ?? os.saidaAntes, '°C')}</b></div></div>
        ${os.itens.length ? `<div class="orc">${os.itens.map(i => `<div class="l"><span>${esc(i.desc)}<small>${i.tipo}</small></span><span>${P.reais(i.valor)}</span></div>`).join('')}<div class="l tot"><span>Total</span><span>${P.reais(tot)}</span></div></div>` : ''}
        ${os.etapa === 'aprovacao' && !os.aprovado ? `<div class="aprov"><button class="btn prim" data-aprova="${os.id}">Aprovar orçamento</button><a class="btn sec" target="_blank" rel="noopener" href="https://wa.me/${P.whats}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o orçamento da ' + os.id)}">Tirar dúvida no WhatsApp</a></div>` : ''}
        ${os.aprovado ? `<p class="mono" style="font-size:13px;color:var(--azul)">✓ Orçamento aprovado · garantia de 90 dias registrada nesta OS</p>` : ''}
        ${os.etapa === 'pronto' ? `<p><b>Pode vir buscar.</b> Av. Vasco da Gama, 277.</p>` : ''}
      </div></div>`;
  }
  $('#formPlaca').addEventListener('submit', e => { e.preventDefault(); mostraOS($('#inPlaca').value); });
  document.querySelectorAll('.dica code').forEach(c => c.addEventListener('click', () => { $('#inPlaca').value = c.dataset.p; mostraOS(c.dataset.p); }));
  $('#resOS').addEventListener('click', e => {
    const b = e.target.closest('[data-aprova]'); if (!b) return;
    const db = P.carregar(), os = db.os.find(o => o.id === b.dataset.aprova);
    os.aprovado = true; os.etapa = 'servico'; P.salvar(db);
    const v = db.veiculos.find(x => x.id === os.veiculo); mostraOS(v.placa);
  });
})();

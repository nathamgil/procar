(function () {
  const P = window.Procar;
  let db = P.carregar();
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const salva = () => P.salvar(db);
  const veic = id => db.veiculos.find(v => v.id === id);
  const cli = id => db.clientes.find(c => c.id === id);
  const hojeS = P.dia(0);
  const totOS = os => os.itens.reduce((a, b) => a + (+b.valor || 0), 0);
  const zap = (fone, txt) => 'https://wa.me/55' + String(fone).replace(/\D/g, '') + '?text=' + encodeURIComponent(txt);
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }
  const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

  const VIEWS = [
    ['hoje', 'Hoje', '◉'], ['patio', 'Pátio', '▦'], ['agenda', 'Agenda', '▤'],
    ['clientes', 'Clientes e carros', '◎'], ['equipe', 'Equipe', '☻'], ['retornos', 'Retornos', '↻'],
    ['estoque', 'Estoque', '▣'], ['relatorios', 'Relatórios', '▲']
  ];
  let view = 'hoje', filtro = '', aba = 'servico';

  // ---------- login ----------
  function logado() { try { return sessionStorage.getItem('procar_on') === '1'; } catch (e) { return window._on; } }
  function login() {
    $('#raiz').innerHTML = `<div class="login"><form id="fl">
      <img src="assets/marca.svg" alt="" width="48" height="48">
      <h1>Área da oficina</h1>
      <label class="c">Usuário<input name="u" value="procar" autocomplete="username"></label>
      <label class="c">Senha<input name="s" type="password" value="demo" autocomplete="current-password"></label>
      <div class="demo">Demonstração · usuário <b>procar</b> · senha <b>demo</b></div>
      <button class="btn prim" style="justify-content:center">Entrar</button>
      <a href="index.html" style="font-size:13px;color:var(--cinza);text-align:center">← voltar ao site</a></form></div>`;
    $('#fl').addEventListener('submit', e => { e.preventDefault(); try { sessionStorage.setItem('procar_on', '1'); } catch (er) { window._on = true; } app(); });
  }

  // ---------- casca ----------
  function app() {
    const pend = db.os.filter(o => o.etapa === 'aprovacao').length;
    const novos = db.agendamentos.filter(a => a.status === 'novo').length;
    const ret = retornos().filter(r => r.dias <= 7 && !db.contatados[r.chave]).length;
    const bd = { patio: pend, agenda: novos, retornos: ret };
    $('#raiz').innerHTML = `<div class="demo-faixa">MODO DEMONSTRAÇÃO · clientes e valores de exemplo, guardados só neste navegador</div>
    <div class="app"><aside class="lat" id="lat">
      <div class="marca"><img src="assets/marca.svg" alt=""><div>PROCAR<small>OFICINA</small></div></div>
      ${VIEWS.map(([id, n, ic]) => `<button data-v="${id}" class="${view === id ? 'on' : ''}"><span class="ic">${ic}</span>${n}${bd[id] ? `<span class="bd">${bd[id]}</span>` : ''}</button>`).join('')}
      <div class="rod">Av. Vasco da Gama, 277<br><button data-reset>↺ restaurar dados de exemplo</button><br><button data-sair>sair</button></div>
    </aside><main class="main" id="main"></main></div>`;
    render();
  }
  function cab(t, sub, extra = '') {
    return `<div class="mh"><div><button class="bt menu-m" data-menu>☰ menu</button><h1>${t}</h1><p>${sub}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap">${extra}</div></div>`;
  }
  function render() {
    document.querySelectorAll('.lat button[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    $('#main').innerHTML = ({ hoje, patio, agenda, clientes, equipe: equipeV, retornos: retornosV, estoque, relatorios })[view]();
    if (view === 'patio') arrastar();
  }

  // ---------- hoje ----------
  function hoje() {
    const noPatio = db.os.filter(o => o.etapa !== 'entregue');
    const aprov = db.os.filter(o => o.etapa === 'aprovacao');
    const prontos = db.os.filter(o => o.etapa === 'pronto');
    const mes = hojeS.slice(0, 7);
    const fat = db.historico.filter(h => h.data.startsWith(mes)).reduce((a, b) => a + b.valor, 0);
    const agHoje = db.agendamentos.filter(a => a.data === hojeS);
    const parado = aprov.reduce((a, o) => a + totOS(o), 0);
    const rets = retornos().filter(r => r.dias <= 7).slice(0, 5);
    const d = new Date(); const dataL = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return cab('Bom dia, Procar', dataL.charAt(0).toUpperCase() + dataL.slice(1), `<button class="bt p" data-nova>+ Dar entrada em carro</button>`) + `
    <div class="kpis">
      <div class="kpi"><small>Carros no pátio</small><b>${noPatio.length}</b><span>${prontos.length} pronto(s) para retirar</span></div>
      <div class="kpi alerta"><small>Esperando aprovação</small><b>${aprov.length}</b><span>${P.reais(parado)} parados</span></div>
      <div class="kpi"><small>Agendados hoje</small><b>${agHoje.length}</b><span>${db.agendamentos.filter(a => a.status === 'novo').length} pedido(s) do site para confirmar</span></div>
      <div class="kpi"><small>Faturado no mês</small><b>${P.reais(fat)}</b><span>${db.historico.filter(h => h.data.startsWith(mes)).length} serviços entregues</span></div>
      <div class="kpi"><small>Retornos na semana</small><b>${retornos().filter(r => r.dias <= 7).length}</b><span>clientes para chamar</span></div>
    </div>
    <div class="grade2">
      <div class="cx"><h2>Precisa da sua atenção <small>AGORA</small></h2><div class="lista">
        ${aprov.map(o => { const v = veic(o.veiculo), c = cli(v.cliente); return `<div class="it"><span class="placa">${v.placa}</span><div><b>${esc(v.modelo)}</b> · orçamento de ${P.reais(totOS(o))}<div class="s">${diasEntre(o.entrada, hojeS) > 0 ? 'Enviado há ' + diasEntre(o.entrada, hojeS) + ' dia(s)' : 'Enviado hoje'} · ${esc(c.nome)}</div></div><div style="display:flex;gap:6px"><a class="bt z" target="_blank" rel="noopener" href="${zap(c.fone, `Oi, ${c.nome.split(' ')[0]}! Aqui é da Procar. Conseguiu ver o orçamento do ${v.modelo} (${o.id})? Qualquer dúvida estou por aqui.`)}">Cobrar</a><button class="bt" data-os="${o.id}">Abrir</button></div></div>`; }).join('')}
        ${prontos.map(o => { const v = veic(o.veiculo), c = cli(v.cliente); return `<div class="it"><span class="placa">${v.placa}</span><div><b>${esc(v.modelo)}</b> · pronto para retirada<div class="s">Saída do ar ${o.saidaDepois ?? '—'}°C · ${esc(c.nome)}</div></div><div style="display:flex;gap:6px"><a class="bt z" target="_blank" rel="noopener" href="${zap(c.fone, `Oi, ${c.nome.split(' ')[0]}! Seu ${v.modelo} está pronto aqui na Procar. Saída do ar medida em ${o.saidaDepois}°C. Pode vir buscar!`)}">Avisar</a><button class="bt" data-entrega="${o.id}">Entregar</button></div></div>`; }).join('')}
        ${db.agendamentos.filter(a => a.status === 'novo').map(a => `<div class="it"><span class="placa">${esc(a.placa)}</span><div><b>${esc(a.nome)}</b> pediu horário pelo ${esc(a.origem)}<div class="s">${P.data(a.data)} · ${a.periodo} · ${esc(P.servico(a.servico).nome)}</div></div><button class="bt p" data-conf="${a.id}">Confirmar</button></div>`).join('')}
      </div></div>
      <div style="display:grid;gap:16px;align-content:start">
        <div class="cx"><h2>Agenda de hoje <small>${agHoje.length} CARRO(S)</small></h2><div class="lista">
          ${agHoje.length ? agHoje.map(a => `<div class="it"><span class="tag">${a.periodo}</span><div><b>${esc(a.nome)}</b><div class="s">${esc(a.modelo || '')} · ${esc(P.servico(a.servico).nome)}${a.sintoma ? ' · “' + esc(a.sintoma) + '”' : ''}</div></div><button class="bt" data-entrada="${a.id}">Dar entrada</button></div>`).join('') : '<div class="it"><span></span><div class="s">Nenhum agendamento hoje.</div></div>'}
        </div></div>
        <div class="cx"><h2>Retornos para chamar <small>HIGIENIZAÇÃO · REVISÃO</small></h2><div class="lista">
          ${rets.map(r => linhaRet(r)).join('') || '<div class="it"><span></span><div class="s">Nada vencendo esta semana.</div></div>'}
        </div></div>
      </div>
    </div>`;
  }

  // ---------- pátio (kanban) ----------
  function patio() {
    const lista = db.os.filter(o => !filtro || (veic(o.veiculo).placa + veic(o.veiculo).modelo + o.id).toLowerCase().includes(filtro.toLowerCase()));
    return cab('Pátio', 'Arraste o card para mudar de etapa. O cliente vê a mudança na hora, pela placa, no site.',
      `<input class="busca-in" placeholder="Buscar placa, modelo ou OS" value="${esc(filtro)}" data-filtro><button class="bt p" data-nova>+ Dar entrada</button>`) +
      `<div class="kan">${P.ETAPAS.map(e => {
        const os = lista.filter(o => o.etapa === e.id);
        return `<div class="col" data-etapa="${e.id}"><h3>${e.nome}<span>${os.length}</span></h3>${os.map(cardOS).join('')}</div>`;
      }).join('')}</div>`;
  }
  function cardOS(o) {
    const v = veic(o.veiculo);
    const atras = o.previsao < hojeS && o.etapa !== 'pronto';
    const cls = atras ? 'atras' : o.etapa === 'aprovacao' ? 'aprov' : o.etapa === 'pronto' ? 'pronto' : '';
    return `<div class="card-os ${cls}" draggable="true" data-os="${o.id}">
      <div class="top"><span class="placa">${v.placa}</span><span class="id">${o.id}</span></div>
      <b>${esc(v.modelo)} ${v.ano}</b><p>${esc(o.queixa)}</p>
      <div class="pe"><span class="resp-c">${avatar(o.tecnico)}${o.tecnico ? esc(o.tecnico) : 'sem responsável'}</span><span>${o.itens.length ? P.reais(totOS(o)) : '—'}</span></div>
      <span class="tag ${o.vistoria?.feita ? 'v' : 'a'}" style="justify-self:start">${o.vistoria?.feita ? '✓ vistoria' + (o.vistoria.marcas.length ? ' · ' + o.vistoria.marcas.length + ' avaria(s)' : '') : 'vistoria pendente'}</span>
      ${atras ? '<span class="tag r">Atrasado</span>' : `<span class="pe"><span>Prev. ${P.data(o.previsao)}</span><span>${v.gas}</span></span>`}
    </div>`;
  }
  function arrastar() {
    let arr = null;
    document.querySelectorAll('.card-os').forEach(c => {
      c.addEventListener('dragstart', () => { arr = c.dataset.os; c.style.opacity = .4; });
      c.addEventListener('dragend', () => { c.style.opacity = 1; });
    });
    document.querySelectorAll('.col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('sobre'); });
      col.addEventListener('dragleave', () => col.classList.remove('sobre'));
      col.addEventListener('drop', e => {
        e.preventDefault(); col.classList.remove('sobre');
        const o = db.os.find(x => x.id === arr); if (!o) return;
        o.etapa = col.dataset.etapa; if (o.etapa === 'servico') o.aprovado = true; salva(); toast(`${o.id} → ${P.ETAPAS.find(x => x.id === o.etapa).nome}`); app();
      });
    });
  }

  // ---------- OS (diálogo) ----------
  function abaServico(o, v, c, hist) {
    return `
      <div class="campos">
        <label class="w2">Cliente<input value="${esc(c.nome)}" disabled></label>
        <label>WhatsApp<input value="${esc(c.fone)}" disabled></label>
        <label>Veículo<input value="${esc(v.modelo)} ${v.ano}" disabled></label>
        <label>Etapa<select data-f="etapa">${P.ETAPAS.map(e => `<option value="${e.id}" ${e.id === o.etapa ? 'selected' : ''}>${e.nome}</option>`).join('')}</select></label>
        <label>Responsável pelo carro<select data-f="tecnico">${['', ...equipe().map(f => f.nome)].map(t => `<option ${t === o.tecnico ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Gás<input value="${v.gas}" disabled></label>
        <label>Previsão<input type="date" data-f="previsao" value="${o.previsao}"></label>
        <label class="w2">Nº da OS no Genius<input data-f="genius" value="${esc(o.genius || '')}" placeholder="Enquanto os dois sistemas rodam juntos"></label>
        <label class="w2">Nota fiscal<select data-f="nf"><option value="">Ainda não emitida</option><option value="emitida" ${o.nf === 'emitida' ? 'selected' : ''}>Emitida no Genius</option></select></label>
        <label class="w4">Queixa do cliente<input data-f="queixa" value="${esc(o.queixa)}"></label>
        <label>Pressão baixa (psi)<input type="number" data-f="baixa" value="${o.baixa ?? ''}"></label>
        <label>Pressão alta (psi)<input type="number" data-f="alta" value="${o.alta ?? ''}"></label>
        <label>Saída antes (°C)<input type="number" step=".1" data-f="saidaAntes" value="${o.saidaAntes ?? ''}"></label>
        <label>Saída depois (°C)<input type="number" step=".1" data-f="saidaDepois" value="${o.saidaDepois ?? ''}"></label>
        <label class="w4">Diagnóstico (o cliente vê no site)<textarea data-f="diagnostico">${esc(o.diagnostico)}</textarea></label>
      </div>
      ${o.saidaAntes != null && o.saidaDepois != null ? `<div class="delta"><div><small class="rot">Antes</small><br><b>${o.saidaAntes}°C</b></div><span class="seta">→</span><div><small class="rot">Depois</small><br><b style="color:var(--azul)">${o.saidaDepois}°C</b></div><span style="color:var(--cinza);font-size:14px">Temperatura de saída medida no painel central. Vai no comprovante do cliente.</span></div>` : ''}
      <div><span class="rot v">Orçamento</span><div class="itens" id="itens" style="margin-top:10px">${o.itens.map((it, i) => linhaItem(it, i)).join('')}</div>
        <button class="bt" data-additem style="margin-top:4px">+ item</button>
        <div class="tot-l"><span>Total</span><span class="mono" id="totDlg">${P.reais(totOS(o))}</span></div>
        <p style="font-size:13px;margin-top:6px;color:${o.aprovado ? '#11643a' : 'var(--cinza)'}">${o.aprovado ? '✓ Aprovado pelo cliente' : 'Ainda não aprovado. O cliente pode aprovar pelo site, digitando a placa.'}</p>
      </div>
      ${hist.length ? `<div><span class="rot">Histórico deste carro</span><div class="hist-v" style="margin-top:6px">${hist.map(h => `<div><span>${P.data(h.data)} · ${esc(P.servico(h.servico).nome)}</span><span class="mono">${P.reais(h.valor)}</span></div>`).join('')}</div></div>` : ''}
      <div class="acoes-dlg">
        <a class="bt z" target="_blank" rel="noopener" data-envia href="#">Enviar orçamento no WhatsApp</a>
        <button class="bt" data-avanca="${o.id}">Avançar etapa →</button>
        <button class="bt p" data-salva="${o.id}">Salvar</button>
      </div>`;
  }
  function abrirOS(id, qual) {
    if (qual) aba = qual;
    const o = db.os.find(x => x.id === id), v = veic(o.veiculo), c = cli(v.cliente);
    const hist = db.historico.filter(h => h.veiculo === v.id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
    const vi = vistoriaDe(o, v);
    $('#dlg-tit').innerHTML = `${o.id} · <span class="mono">${v.placa}</span> · ${esc(v.modelo)}`;
    const ABAS = [['servico', 'Serviço e orçamento'], ['vistoria', 'Vistoria de entrada' + (vi.feita ? ' ✓' : '')], ['cadastro', 'Cliente e veículo']];
    $('#dlg-corpo').innerHTML = `<div class="abas" role="tablist">${ABAS.map(([k, n]) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${aba === k}">${n}</button>`).join('')}</div>` +
      (aba === 'vistoria' ? abaVistoria(o, v, c) : aba === 'cadastro' ? abaCadastro(v, c) + `<div class="acoes-dlg"><button class="bt p" data-salva="${o.id}">Salvar</button></div>` : abaServico(o, v, c, hist));
    const dlg = $('#dlg'); dlg.dataset.os = id; dlg.dataset.veic = v.id;
    atualizaEnvio(o, v, c); ligaVistoria(o, v); validaDoc();
    if (!dlg.open) dlg.showModal();
  }
  function linhaItem(it, i) {
    return `<div class="l" data-i="${i}"><input data-it="desc" value="${esc(it.desc)}" placeholder="Descrição"><select data-it="tipo"><option ${it.tipo === 'peça' ? 'selected' : ''}>peça</option><option ${it.tipo === 'mão de obra' ? 'selected' : ''}>mão de obra</option></select><input data-it="valor" type="number" value="${it.valor}"><button class="x" data-rmitem="${i}" aria-label="Remover">×</button></div>`;
  }
  function lerDlg() {
    const o = db.os.find(x => x.id === $('#dlg').dataset.os);
    $('#dlg-corpo').querySelectorAll('[data-f]').forEach(el => {
      const k = el.dataset.f; let v = el.value;
      if (['baixa', 'alta', 'saidaAntes', 'saidaDepois'].includes(k)) v = v === '' ? null : +v;
      o[k] = v;
    });
    const v = veic(o.veiculo); lerVistoria(o, v); if ($('#dlg-corpo [data-c]')) lerCadastro(v, cli(v.cliente));
    if ($('#itens')) o.itens = [...$('#itens').querySelectorAll('.l')].map(l => ({ desc: l.querySelector('[data-it=desc]').value, tipo: l.querySelector('[data-it=tipo]').value, valor: +l.querySelector('[data-it=valor]').value || 0 })).filter(i => i.desc);
    return o;
  }
  function atualizaEnvio(o, v, c) {
    const a = $('[data-envia]'); if (!a) return;
    const linhas = o.itens.map(i => `• ${i.desc}: ${P.reais(i.valor)}`).join('\n');
    a.href = zap(c.fone, `Oi, ${c.nome.split(' ')[0]}! Aqui é da Procar.\nDiagnóstico do ${v.modelo} (${v.placa}):\n${o.diagnostico}\n\n${linhas}\nTotal: ${P.reais(totOS(o))}\n\nPara aprovar, é só digitar a placa em nathamgil.github.io/procar/#acompanhar`);
  }

  // ---------- nova entrada ----------
  function novaEntrada(ag) {
    $('#dlg-tit').textContent = 'Dar entrada em carro';
    $('#dlg').dataset.os = '';
    $('#dlg-corpo').innerHTML = `<form id="fNova" class="campos">
      <label>Placa<input name="placa" required value="${esc(ag?.placa || '')}" style="text-transform:uppercase;font-family:var(--mono);font-weight:700"></label>
      <label class="w2">Carro<input name="modelo" required value="${esc(ag?.modelo || '')}" placeholder="Modelo"></label>
      <label>Ano<input name="ano" type="number" value="${(ag?.modelo || '').match(/\d{4}/)?.[0] || ''}"></label>
      <label class="w2">Cliente<input name="nome" required value="${esc(ag?.nome || '')}"></label>
      <label>WhatsApp<input name="fone" value="${esc(ag?.fone || '')}"></label>
      <label>Gás<select name="gas"><option>R-134a</option><option>R-1234yf</option></select></label>
      <label class="w2">Responsável pelo carro<select name="tecnico"><option value=""></option>${equipe().map(f => `<option>${esc(f.nome)}</option>`).join('')}</select></label>
      <label class="w2">Queixa<input name="queixa" value="${esc(ag?.sintoma || '')}" placeholder="O que o cliente relatou"></label>
      <div class="w4 acoes-dlg"><span style="margin-right:auto;align-self:center;font-size:13px;color:var(--cinza)">Depois de abrir, a vistoria de entrada já aparece.</span><button class="bt p">Abrir OS e fazer a vistoria</button></div></form>`;
    $('#fNova').addEventListener('submit', e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      const placa = P.placa(f.placa);
      let v = db.veiculos.find(x => x.placa === placa);
      if (!v) {
        const c = { id: 'c' + Date.now(), nome: f.nome, fone: f.fone, origem: ag ? ag.origem : 'Balcão', tipo: 'pf', doc: '', email: '' }; db.clientes.push(c);
        v = { id: 'v' + Date.now(), cliente: c.id, placa, modelo: f.modelo, ano: +f.ano || '', gas: f.gas }; db.veiculos.push(v);
      }
      const n = Math.max(...db.os.map(o => +o.id.slice(3))) + 1;
      db.os.unshift({ id: 'OS-' + n, veiculo: v.id, etapa: 'recebido', entrada: hojeS, previsao: P.dia(1), queixa: f.queixa, tecnico: f.tecnico || '', genius: '', nf: '', vistoria: null, baixa: null, alta: null, saidaAntes: null, saidaDepois: null, diagnostico: '', itens: [], aprovado: false });
      if (ag) ag.status = 'entrou';
      salva(); $('#dlg').close(); view = 'patio'; app(); abrirOS('OS-' + n, 'vistoria'); toast(`OS-${n} aberta para ${placa}`);
    });
    $('#dlg').showModal();
  }

  // ---------- agenda ----------
  function agenda() {
    const dias = []; for (let n = 0; dias.length < 6; n++) { const d = new Date(P.hoje); d.setDate(d.getDate() + n); if (d.getDay() !== 0) dias.push(d); }
    const S = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return cab('Agenda', 'Pedidos do site entram aqui em amarelo. Confirme e o cliente recebe a mensagem.') + `<div class="sem">${dias.map(d => {
      const ds = d.toISOString().slice(0, 10), ags = db.agendamentos.filter(a => a.data === ds && a.status !== 'entrou');
      const bloco = per => ags.filter(a => a.periodo === per).map(a => `<div class="ag-c ${a.status === 'novo' ? 'novo' : ''}" data-ag="${a.id}"><b>${esc(a.nome)}</b><span>${esc(a.modelo || a.placa)}</span><span style="color:var(--cinza)">${esc(P.servico(a.servico).nome)}</span>${a.status === 'novo' ? '<span class="tag a">confirmar</span>' : ''}</div>`).join('');
      return `<div class="dia-c ${ds === hojeS ? 'hoje' : ''}"><h3>${ds === hojeS ? 'hoje' : S[d.getDay()]}<b>${d.getDate()}/${d.getMonth() + 1}</b></h3><div class="per-l">manhã</div>${bloco('manhã')}<div class="per-l">tarde</div>${bloco('tarde')}</div>`;
    }).join('')}</div>`;
  }
  function abrirAg(id) {
    const a = db.agendamentos.find(x => x.id === id);
    $('#dlg-tit').textContent = `${a.id} · ${P.data(a.data)} · ${a.periodo}`; $('#dlg').dataset.os = '';
    $('#dlg-corpo').innerHTML = `<div class="hist-v">
      <div><span>Cliente</span><b>${esc(a.nome)}</b></div><div><span>WhatsApp</span><b>${esc(a.fone)}</b></div>
      <div><span>Carro</span><b>${esc(a.modelo || '—')} · <span class="placa">${esc(a.placa)}</span></b></div>
      <div><span>Serviço</span><b>${esc(P.servico(a.servico).nome)}</b></div><div><span>Sintoma</span><b>${esc(a.sintoma || '—')}</b></div><div><span>Origem</span><b>${esc(a.origem)}</b></div></div>
      <div class="acoes-dlg">${a.status === 'novo' ? `<a class="bt z" target="_blank" rel="noopener" data-conf="${a.id}" href="${zap(a.fone, `Oi, ${a.nome.split(' ')[0]}! Aqui é da Procar. Seu horário está confirmado: ${P.data(a.data)}, de ${a.periodo}. Endereço: Av. Vasco da Gama, 277 (sentido Rio Vermelho).`)}">Confirmar no WhatsApp</a>` : ''}<button class="bt p" data-entrada="${a.id}">Dar entrada</button></div>`;
    $('#dlg').showModal();
  }

  // ---------- clientes ----------
  function clientes() {
    const q = filtro.toLowerCase();
    const linhas = db.veiculos.map(v => {
      const c = cli(v.cliente), h = db.historico.filter(x => x.veiculo === v.id);
      const ult = h.sort((a, b) => b.data.localeCompare(a.data))[0];
      return { v, c, n: h.length, gasto: h.reduce((a, b) => a + b.valor, 0), ult };
    }).filter(l => !q || (l.v.placa + l.v.modelo + l.c.nome + (l.c.doc || '') + (l.v.chassi || '')).toLowerCase().includes(q)).sort((a, b) => b.gasto - a.gasto);
    return cab('Clientes e carros', `${db.clientes.length} clientes · ${db.veiculos.length} carros. Cada placa guarda o histórico inteiro.`, `<input class="busca-in" placeholder="Buscar placa, nome, CPF/CNPJ ou chassi" value="${esc(filtro)}" data-filtro><button class="bt" data-exporta>Exportar planilha</button>`) +
      `<div class="cx"><table class="t"><thead><tr><th>Placa</th><th>Carro</th><th>Cliente</th><th>Origem</th><th>Último serviço</th><th style="text-align:right">Visitas</th><th style="text-align:right">Total gasto</th><th></th></tr></thead><tbody>
      ${linhas.map(l => `<tr><td><span class="placa">${l.v.placa}</span></td><td><b>${esc(l.v.modelo)}</b> ${l.v.ano} <span class="tag">${l.v.gas}</span></td><td>${esc(l.c.nome)}<div style="font:500 12px var(--mono);color:var(--cinza)">${esc(l.c.doc || 'sem CPF/CNPJ')}</div></td><td>${l.c.origem === 'Frota' ? '<span class="tag a">Frota</span>' : esc(l.c.origem)}</td><td>${l.ult ? P.data(l.ult.data) + ' · ' + esc(P.servico(l.ult.servico).nome) : '—'}</td><td class="n">${l.n}</td><td class="n">${P.reais(l.gasto)}</td><td style="white-space:nowrap"><button class="bt" data-ficha="${l.v.id}">Ficha</button> <a class="bt z" target="_blank" rel="noopener" href="${zap(l.c.fone, `Oi, ${l.c.nome.split(' ')[0]}! Aqui é da Procar.`)}">WhatsApp</a></td></tr>`).join('')}
      </tbody></table></div>`;
  }

  // ---------- retornos ----------
  function retornos() {
    const out = [];
    db.veiculos.forEach(v => {
      ['higienizacao', 'filtro', 'carga', 'compressor'].forEach(s => {
        const h = db.historico.filter(x => x.veiculo === v.id && x.servico === s).sort((a, b) => b.data.localeCompare(a.data))[0];
        if (!h) return;
        const prazo = P.servico(s).retorno; if (!prazo) return;
        const vence = new Date(h.data); vence.setDate(vence.getDate() + prazo);
        const dias = diasEntre(hojeS, vence.toISOString().slice(0, 10));
        if (dias <= 30) out.push({ v, c: cli(v.cliente), s, ult: h.data, dias, chave: v.id + s + h.data });
      });
    });
    return out.sort((a, b) => a.dias - b.dias);
  }
  function linhaRet(r) {
    const tipo = ['higienizacao', 'filtro'].includes(r.s) ? 'higienização' : 'revisão anual';
    const msg = `Oi, ${r.c.nome.split(' ')[0]}! Aqui é da Procar. Já faz ${tipo === 'higienização' ? '6 meses' : '1 ano'} da última ${tipo} do seu ${r.v.modelo}. Quer agendar? Temos horário esta semana.`;
    const feito = db.contatados[r.chave];
    return `<div class="it"><span class="placa">${r.v.placa}</span><div><b>${esc(r.c.nome)}</b> · ${tipo}<div class="s">Último: ${P.data(r.ult)} · ${r.dias < 0 ? `venceu há ${-r.dias} dia(s)` : r.dias === 0 ? 'vence hoje' : `vence em ${r.dias} dia(s)`}</div></div>${feito ? '<span class="tag v">chamado</span>' : `<a class="bt z" target="_blank" rel="noopener" data-chamou="${r.chave}" href="${zap(r.c.fone, msg)}">Chamar</a>`}</div>`;
  }
  function retornosV() {
    const rs = retornos();
    const vencidos = rs.filter(r => r.dias <= 0), semana = rs.filter(r => r.dias > 0 && r.dias <= 7), mes = rs.filter(r => r.dias > 7);
    const bloco = (t, l) => `<div class="cx" style="margin-bottom:16px"><h2>${t} <small>${l.length}</small></h2><div class="lista">${l.map(linhaRet).join('') || '<div class="it"><span></span><div class="s">Nenhum.</div></div>'}</div></div>`;
    return cab('Retornos', 'Cliente que fez higienização volta em 6 meses; carga de gás e compressor, em 1 ano. A mensagem já vai escrita.') +
      bloco('Vencidos', vencidos) + bloco('Vencem nesta semana', semana) + bloco('Próximos 30 dias', mes);
  }

  // ---------- estoque ----------
  function estoque() {
    const baixo = db.estoque.filter(e => e.qtd <= e.min);
    const valor = db.estoque.reduce((a, e) => a + e.qtd * e.custo, 0);
    return cab('Estoque', `${baixo.length} item(ns) no mínimo ou abaixo · ${P.reais(valor)} parados em estoque`) +
      `<div class="cx"><table class="t"><thead><tr><th>Item</th><th>Nível</th><th style="text-align:right">Quantidade</th><th style="text-align:right">Mínimo</th><th style="text-align:right">Custo un.</th><th></th></tr></thead><tbody>
      ${db.estoque.map(e => { const f = Math.min(e.qtd / (e.min * 2), 1); const b = e.qtd <= e.min; return `<tr><td><b>${esc(e.item)}</b> ${b ? '<span class="tag r">repor</span>' : ''}</td><td><div class="barra-est"><i class="${b ? 'b' : ''}" style="width:${f * 100}%"></i></div></td><td class="n">${String(e.qtd).replace('.', ',')} ${e.un}</td><td class="n">${e.min} ${e.un}</td><td class="n">${P.reais(e.custo)}</td><td style="white-space:nowrap"><button class="bt" data-est="${e.id}" data-d="-1">−</button> <button class="bt" data-est="${e.id}" data-d="1">+</button></td></tr>`; }).join('')}
      </tbody></table></div>`;
  }

  // ---------- relatórios ----------
  function relatorios() {
    const meses = []; for (let m = 5; m >= 0; m--) { const d = new Date(P.hoje); d.setDate(1); d.setMonth(d.getMonth() - m); meses.push(d.toISOString().slice(0, 7)); }
    const NM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const vals = meses.map(m => db.historico.filter(h => h.data.startsWith(m)).reduce((a, b) => a + b.valor, 0));
    const qts = meses.map(m => db.historico.filter(h => h.data.startsWith(m)).length);
    const mx = Math.max(...vals) * 1.15, W = 600, H = 230, bw = 58;
    const svg = `<svg viewBox="0 0 ${W} ${H + 40}" role="img" aria-label="Faturamento por mês">
      ${[0, .5, 1].map(f => `<line x1="40" x2="${W}" y1="${H - f * H * .9}" y2="${H - f * H * .9}" stroke="#e6ebf2"/><text x="34" y="${H - f * H * .9 + 4}" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="#55617a">${Math.round(mx * f * .9 / 1000)}k</text>`).join('')}
      ${vals.map((v, i) => { const h = v / mx * H; const x = 60 + i * ((W - 70) / 6); const ult = i === 5; return `<rect x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="3" fill="${ult ? '#d62a2a' : '#14275a'}"/><text x="${x + bw / 2}" y="${H - h - 8}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="11" fill="#0b1430">${(v / 1000).toFixed(1).replace('.', ',')}k</text><text x="${x + bw / 2}" y="${H + 18}" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" fill="#55617a">${NM[+meses[i].slice(5) - 1]}${ult ? ' (parcial)' : ''}</text><text x="${x + bw / 2}" y="${H + 33}" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="#8a95ab">${qts[i]} OS</text>`; }).join('')}
    </svg>`;
    const porServ = {}; db.historico.forEach(h => { porServ[h.servico] = porServ[h.servico] || { n: 0, v: 0 }; porServ[h.servico].n++; porServ[h.servico].v += h.valor; });
    const rk = Object.entries(porServ).sort((a, b) => b[1].v - a[1].v); const mxr = rk[0][1].v;
    const origem = {}; db.clientes.forEach(c => origem[c.origem] = (origem[c.origem] || 0) + 1);
    const tot = vals.reduce((a, b) => a + b, 0), totq = qts.reduce((a, b) => a + b, 0);
    return cab('Relatórios', 'Últimos 6 meses') + `
      <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div class="kpi"><small>Faturamento 6 meses</small><b>${P.reais(tot)}</b></div>
        <div class="kpi"><small>Ordens de serviço</small><b>${totq}</b></div>
        <div class="kpi"><small>Ticket médio</small><b>${P.reais(tot / totq)}</b></div>
        <div class="kpi"><small>Carros atendidos</small><b>${new Set(db.historico.map(h => h.veiculo)).size}</b></div>
      </div>
      <div class="grade2">
        <div class="cx"><h2>Faturamento por mês <small>R$</small></h2><div class="graf">${svg}</div></div>
        <div style="display:grid;gap:16px;align-content:start">
          <div class="cx"><h2>O que mais fatura</h2><div class="rk">${rk.map(([s, x]) => `<span>${esc(P.servico(s).nome)} <span style="color:var(--cinza)">· ${x.n}</span></span><b class="mono">${P.reais(x.v)}</b><div class="bar"><i style="width:${x.v / mxr * 100}%"></i></div>`).join('')}</div></div>
          <div class="cx"><h2>De onde vêm os clientes</h2><div class="rk">${Object.entries(origem).sort((a, b) => b[1] - a[1]).map(([o, n]) => `<span>${esc(o)}</span><b class="mono">${n}</b><div class="bar"><i style="width:${n / db.clientes.length * 100}%;background:var(--vermelho)"></i></div>`).join('')}</div></div>
        </div>
      </div>`;
  }

  // ---------- eventos ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a, .ag-c, .card-os'); if (!t) return;
    const d = t.dataset;
    if (d.v) { view = d.v; filtro = ''; $('#lat').classList.remove('aberto'); render(); }
    else if (d.menu !== undefined) $('#lat').classList.toggle('aberto');
    else if (d.reset !== undefined) { db = P.reset(); app(); toast('Dados de exemplo restaurados'); }
    else if (d.sair !== undefined) { try { sessionStorage.removeItem('procar_on'); } catch (er) { window._on = false; } login(); }
    else if (d.fecha !== undefined) $('#dlg').close();
    else if (d.nova !== undefined) novaEntrada();
    else if (d.os && !t.closest('dialog')) abrirOS(d.os, 'servico');
    else if (d.ag) abrirAg(d.ag);
    else if (d.conf) { const a = db.agendamentos.find(x => x.id === d.conf); a.status = 'confirmado'; salva(); if (t.tagName !== 'A') toast('Agendamento confirmado'); if ($('#dlg').open) $('#dlg').close(); app(); }
    else if (d.entrada) { const a = db.agendamentos.find(x => x.id === d.entrada); if ($('#dlg').open) $('#dlg').close(); novaEntrada(a); }
    else if (d.entrega) { const o = db.os.find(x => x.id === d.entrega); db.os = db.os.filter(x => x !== o); db.historico.push({ id: o.id, veiculo: o.veiculo, servico: 'higienizacao', data: hojeS, valor: totOS(o) }); salva(); app(); toast(`${o.id} entregue · ${P.reais(totOS(o))} no caixa`); }
    else if (d.chamou) { db.contatados[d.chamou] = hojeS; salva(); setTimeout(app, 50); }
    else if (d.est) { const it = db.estoque.find(x => x.id === d.est); it.qtd = Math.max(0, Math.round((it.qtd + +d.d) * 10) / 10); salva(); render(); }
    else if (d.additem !== undefined) { const o = lerDlg(); o.itens.push({ desc: 'Novo item', tipo: 'peça', valor: 0 }); abrirOS(o.id); }
    else if (d.rmitem !== undefined) { const o = lerDlg(); o.itens.splice(+d.rmitem, 1); abrirOS(o.id); }
    else if (d.salva) { lerDlg(); salva(); $('#dlg').close(); app(); toast('OS salva'); }
    else if (d.avanca) { const o = lerDlg(); const i = P.ETAPAS.findIndex(x => x.id === o.etapa); if (i < P.ETAPAS.length - 1) o.etapa = P.ETAPAS[i + 1].id; if (o.etapa === 'servico') o.aprovado = true; salva(); abrirOS(o.id); app(); $('#dlg').open || abrirOS(o.id); toast('Etapa: ' + P.ETAPAS.find(x => x.id === o.etapa).nome); }
  });
  document.addEventListener('input', e => {
    if (e.target.dataset.filtro !== undefined) { filtro = e.target.value; const pos = e.target.selectionStart; render(); const n = $('[data-filtro]'); n.focus(); n.setSelectionRange(pos, pos); }
    if (e.target.closest('#itens') || e.target.closest('#dlg-corpo [data-f]')) {
      if (!$('#dlg').dataset.os) return;
      const o = lerDlg(); $('#totDlg').textContent = P.reais(totOS(o)); const v = veic(o.veiculo); atualizaEnvio(o, v, cli(v.cliente));
    }
  });
  $('#dlg').addEventListener('click', e => { if (e.target.id === 'dlg') $('#dlg').close(); });


  // ====================================================================
  // Cadastro completo, vistoria de entrada, equipe (pedidos da reunião de nov/2026)
  // ====================================================================
  const TIPOS = { risco: ['R', 'Risco', '#d62a2a'], amassado: ['A', 'Amassado', '#d97a00'], pintura: ['P', 'Pintura diferente', '#7a3fd1'], trinca: ['T', 'Trinca ou quebrado', '#0b1430'] };
  const ITENS = [['estepe', 'Estepe'], ['macaco', 'Macaco'], ['chave', 'Chave de roda'], ['triangulo', 'Triângulo'], ['tapetes', 'Tapetes'], ['som', 'Som / multimídia'], ['manual', 'Manual'], ['documento', 'Documento do carro']];
  const LUZES = ['Injeção', 'ABS', 'Airbag', 'Bateria', 'Óleo', 'Temperatura'];
  const COMB = ['Reserva', '1/4', '1/2', '3/4', 'Cheio'];
  const FOTOS = [['frente', 'Frente'], ['traseira', 'Traseira'], ['esquerda', 'Lado esquerdo'], ['direita', 'Lado direito']];
  let ferr = 'risco';
  const equipe = () => db.equipe || (db.equipe = [{ id: 'f1', nome: 'Anderson', funcao: 'Técnico' }, { id: 'f2', nome: 'Rafael', funcao: 'Técnico' }]);
  const iniciais = n => (n || '?').trim().slice(0, 2).toUpperCase();
  const avatar = n => n ? `<span class="avatar" title="${esc(n)}">${iniciais(n)}</span>` : '<span class="avatar sem">?</span>';
  const titulo = s => String(s || '').toLowerCase().replace(/(^|[\s\-\/.(])([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, m => m.toLowerCase()).replace(/\b(Sa|S\.a\.|S\/a|Ltda|Me|Epp|Eireli)(?=$|[\s.,])/g, m => m.toUpperCase()).replace(/^./, m => m.toUpperCase());

  function vistoriaDe(o, v) {
    if (!o.vistoria) o.vistoria = { feita: false, por: '', hora: '', combustivel: 2, km: v.km || '', itens: {}, luzes: [], pertences: '', obs: '', marcas: [], assinatura: [], fotos: {} };
    return o.vistoria;
  }
  function regiao(x, y) {
    const lado = y < 100 ? ' direito' : y > 180 ? ' esquerdo' : '';
    if (lado) return (x < 70 ? 'Para-choque dianteiro,' : x < 190 ? 'Paralama dianteiro' : x < 300 ? 'Porta dianteira' : x < 400 ? 'Porta traseira' : x < 490 ? 'Paralama traseiro' : 'Para-choque traseiro,') + (x < 70 || x >= 490 ? ' lado' : '') + (lado === ' direito' ? (x >= 190 && x < 400 ? ' direita' : ' direito') : (x >= 190 && x < 400 ? ' esquerda' : ' esquerdo'));
    return x < 70 ? 'Para-choque dianteiro' : x < 190 ? 'Capô' : x < 235 ? 'Para-brisa' : x < 365 ? 'Teto' : x < 402 ? 'Vidro traseiro' : x < 490 ? 'Tampa do porta-malas' : 'Para-choque traseiro';
  }
  function croqui(vi, id) {
    const m = vi.marcas.map((k, i) => `<g class="mk"><circle cx="${k.x}" cy="${k.y}" r="13" fill="${TIPOS[k.tipo][2]}" stroke="#fff" stroke-width="2.5"/><text x="${k.x}" y="${k.y + 4.5}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-weight="700" font-size="12" fill="#fff">${TIPOS[k.tipo][0]}${i + 1}</text></g>`).join('');
    return `<svg ${id ? `id="${id}"` : ''} class="croqui" viewBox="0 0 560 280" role="img" aria-label="Croqui do carro visto de cima">
      <g fill="none" stroke="#14275a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
        <rect x="92" y="50" width="62" height="18" rx="6" fill="#14275a"/><rect x="92" y="212" width="62" height="18" rx="6" fill="#14275a"/>
        <rect x="398" y="50" width="62" height="18" rx="6" fill="#14275a"/><rect x="398" y="212" width="62" height="18" rx="6" fill="#14275a"/>
        <path d="M66 66 Q32 72 28 140 Q32 208 66 214 L468 218 Q526 212 532 140 Q526 68 468 62 Z" fill="#fff"/>
        <path d="M186 70 Q176 140 186 210"/><path d="M412 66 Q420 140 412 214"/>
        <path d="M194 86 L238 98 L238 182 L194 194 Q186 140 194 86 Z" fill="#e2ecf8"/>
        <path d="M364 98 L402 88 Q410 140 402 192 L364 182 Z" fill="#e2ecf8"/>
        <rect x="238" y="98" width="126" height="84" rx="6"/>
        <path d="M206 78 L392 80 L362 94 L240 94 Z" fill="#e2ecf8"/><path d="M206 202 L392 200 L362 186 L240 186 Z" fill="#e2ecf8"/>
        <path d="M300 64 V94 M300 186 V216"/>
        <path d="M212 66 l-6 -12 h16 l2 12 M212 214 l-6 12 h16 l2 -12" fill="#fff"/>
        <path d="M40 92 q-6 12 -6 22 l12 -2 q2 -12 6 -22 Z M40 188 q-6 -12 -6 -22 l12 2 q2 12 6 22 Z" fill="#ffe9a8"/>
        <path d="M520 90 q5 12 6 24 l-10 -2 q-1 -12 -5 -22 Z M520 190 q5 -12 6 -24 l-10 2 q-1 12 -5 22 Z" fill="#ffc9c9"/>
      </g>
      <g font-family="IBM Plex Mono,monospace" font-size="10" font-weight="600" fill="#55617a" letter-spacing="1.5">
        <text x="14" y="144" transform="rotate(-90 14 144)" text-anchor="middle">FRENTE</text><text x="548" y="144" transform="rotate(90 548 144)" text-anchor="middle">TRASEIRA</text>
        <text x="280" y="34" text-anchor="middle">LADO DIREITO</text><text x="280" y="256" text-anchor="middle">LADO ESQUERDO · MOTORISTA</text>
      </g>${m}</svg>`;
  }
  const assinaSvg = (vi, id) => `<svg ${id ? `id="${id}"` : ''} class="assina" viewBox="0 0 400 120"><line x1="24" y1="96" x2="376" y2="96" stroke="#d3dbe7" stroke-width="1.5" stroke-dasharray="4 5"/>${(vi.assinatura || []).map(s => `<polyline points="${s.join(' ')}" fill="none" stroke="#0b1430" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;

  function abaVistoria(o, v, c) {
    const vi = vistoriaDe(o, v);
    return `<div class="vis">
      <div>
        <span class="rot v">1 · Marque as avarias no desenho</span>
        <div class="ferr">${Object.entries(TIPOS).map(([k, t]) => `<button type="button" data-ferr="${k}" aria-pressed="${ferr === k}"><i style="background:${t[2]}">${t[0]}</i>${t[1]}</button>`).join('')}</div>
        ${croqui(vi, 'croqui')}
        <div class="marcas">${vi.marcas.length ? vi.marcas.map((k, i) => `<div class="mk-l"><i style="background:${TIPOS[k.tipo][2]}">${TIPOS[k.tipo][0]}${i + 1}</i><b>${TIPOS[k.tipo][1]}</b><span>${regiao(k.x, k.y)}</span><input data-mobs="${i}" value="${esc(k.obs)}" placeholder="Observação"><button class="x" data-rmmarca="${i}" aria-label="Remover">×</button></div>`).join('') : '<p class="vazio-p">Nenhuma avaria marcada. Toque no desenho, no ponto onde ela está.</p>'}</div>
        <span class="rot" style="display:block;margin-top:16px">Fotos da entrada</span>
        <div class="fotos-v">${FOTOS.map(([k, n]) => `<label class="foto-s ${vi.fotos?.[k] ? 'tem' : ''}">${vi.fotos?.[k] ? `<img src="${vi.fotos[k]}" alt="${n}">` : '<span>＋</span>'}<small>${n}</small><input type="file" accept="image/*" capture="environment" data-foto="${k}" hidden></label>`).join('')}</div>
      </div>
      <div>
        <span class="rot v">2 · Como o carro chegou</span>
        <div class="campos" style="grid-template-columns:1fr 1fr;margin-top:10px">
          <label class="w4">Combustível<div class="seg">${COMB.map((n, i) => `<button type="button" data-comb="${i}" aria-pressed="${vi.combustivel === i}">${n}</button>`).join('')}</div></label>
          <label>Quilometragem<input type="number" data-vi="km" value="${vi.km ?? ''}"></label>
          <label>Vistoria feita por<select data-vi="por"><option value=""></option>${equipe().map(f => `<option ${f.nome === vi.por ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></label>
        </div>
        <span class="rot" style="display:block;margin-top:14px">Itens no carro</span>
        <div class="checks">${ITENS.map(([k, n]) => `<label><input type="checkbox" data-item="${k}" ${vi.itens[k] ? 'checked' : ''}>${n}</label>`).join('')}</div>
        <span class="rot" style="display:block;margin-top:14px">Luzes acesas no painel</span>
        <div class="checks">${LUZES.map(n => `<label><input type="checkbox" data-luz="${n}" ${vi.luzes.includes(n) ? 'checked' : ''}>${n}</label>`).join('')}</div>
        <div class="campos" style="grid-template-columns:1fr;margin-top:14px">
          <label>Pertences deixados no carro<input data-vi="pertences" value="${esc(vi.pertences)}" placeholder="Ex.: cadeirinha, óculos, pen drive"></label>
          <label>Observações<input data-vi="obs" value="${esc(vi.obs)}"></label>
        </div>
        <span class="rot v" style="display:block;margin-top:16px">3 · Assinatura do cliente</span>
        <div class="assina-cx">${assinaSvg(vi, 'assina')}<button type="button" class="bt" data-limpaass>Limpar</button></div>
        <p class="dica-v">${esc(c.nome)} confere o desenho e assina na tela, com o dedo ou o mouse.</p>
      </div>
    </div>
    <div class="acoes-dlg">
      ${vi.feita ? `<span class="tag v" style="margin-right:auto;align-self:center">Vistoria concluída às ${vi.hora}${vi.por ? ' por ' + esc(vi.por) : ''}</span>` : ''}
      <button class="bt" data-termo="${o.id}">Ver termo de vistoria</button>
      <button class="bt p" data-concluivist="${o.id}">${vi.feita ? 'Salvar vistoria' : 'Concluir vistoria'}</button>
    </div>`;
  }

  function abaCadastro(v, c) {
    const pj = c.tipo === 'pj';
    const i = (rot, k, val, cls = '', extra = '') => `<label class="${cls}">${rot}<input data-c="${k}" value="${esc(val ?? '')}" ${extra}></label>`;
    const iv = (rot, k, val, cls = '', extra = '') => `<label class="${cls}">${rot}<input data-ve="${k}" value="${esc(val ?? '')}" ${extra}></label>`;
    return `<div><span class="rot v">Cliente</span>
      <div class="campos" style="margin-top:10px">
        <label>Tipo<select data-c="tipo"><option value="pf" ${!pj ? 'selected' : ''}>Pessoa física</option><option value="pj" ${pj ? 'selected' : ''}>Empresa</option></select></label>
        ${pj ? `<label class="w2">CNPJ<div class="com-bt"><input data-c="doc" value="${esc(c.doc || '')}" placeholder="00.000.000/0000-00" inputmode="numeric"><button type="button" class="bt p" data-cnpj>Buscar na Receita</button></div></label><label>Situação<input data-c="situacao" value="${esc(c.situacao || '')}" readonly></label>
        <p class="w4 status-doc" id="stDoc">${c.atividade ? 'Atividade principal: ' + esc(c.atividade) : 'Digite o CNPJ e os dados da empresa vêm direto da Receita Federal.'}</p>`
        : `<label>CPF<input data-c="doc" value="${esc(c.doc || '')}" placeholder="000.000.000-00" inputmode="numeric"></label><p class="w2 status-doc" id="stDoc" style="align-self:end"></p>`}
        ${i(pj ? 'Razão social' : 'Nome completo', 'nome', c.nome, 'w2')}
        ${pj ? i('Nome fantasia', 'fantasia', c.fantasia, 'w2') : i('WhatsApp', 'fone', c.fone) + i('E-mail', 'email', c.email, '', 'type="email"')}
        ${pj ? i('Telefone', 'fone', c.fone, 'w2') + i('E-mail', 'email', c.email, 'w2', 'type="email"') : ''}
        ${i('CEP', 'cep', c.cep, '', 'inputmode="numeric" placeholder="00000-000"')}
        ${i('Endereço', 'endereco', c.endereco, 'w2')}
        ${i('Número', 'numero', c.numero)}
        ${i('Bairro', 'bairro', c.bairro, 'w2')}
        ${i('Cidade', 'cidade', c.cidade)}
        ${i('UF', 'uf', c.uf, '', 'maxlength="2"')}
      </div></div>
      <div><span class="rot v">Veículo</span>
      <div class="campos" style="margin-top:10px">
        ${iv('Placa', 'placa', v.placa, '', 'maxlength="8" style="text-transform:uppercase;font-family:var(--mono);font-weight:700"')}
        ${iv('Marca e modelo', 'modelo', v.modelo, 'w2')}
        ${iv('Cor', 'cor', v.cor)}
        ${iv('Ano de fabricação', 'ano', v.ano, '', 'type="number"')}
        ${iv('Ano do modelo', 'anoModelo', v.anoModelo, '', 'type="number"')}
        ${iv('Chassi', 'chassi', v.chassi, 'w2', 'maxlength="17" style="text-transform:uppercase;font-family:var(--mono);letter-spacing:.06em"')}
        ${iv('Quilometragem', 'km', v.km, '', 'type="number"')}
        <label>Combustível<select data-ve="combustivel">${['Flex', 'Gasolina', 'Diesel', 'Híbrido', 'Elétrico'].map(x => `<option ${x === v.combustivel ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Gás do ar<select data-ve="gas">${['R-134a', 'R-1234yf'].map(x => `<option ${x === v.gas ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      </div></div>`;
  }
  function lerCadastro(v, c) {
    const corpo = $('#dlg-corpo');
    corpo.querySelectorAll('[data-c]').forEach(el => { c[el.dataset.c] = el.value.trim(); });
    corpo.querySelectorAll('[data-ve]').forEach(el => {
      const k = el.dataset.ve; let x = el.value.trim();
      if (k === 'placa') x = P.placa(x); if (k === 'chassi') x = x.toUpperCase();
      if (['ano', 'anoModelo', 'km'].includes(k)) x = x === '' ? '' : +x;
      v[k] = x;
    });
  }
  function lerVistoria(o, v) {
    if (!$('#croqui')) return;
    const vi = vistoriaDe(o, v), corpo = $('#dlg-corpo');
    corpo.querySelectorAll('[data-vi]').forEach(el => { vi[el.dataset.vi] = el.dataset.vi === 'km' ? (el.value === '' ? '' : +el.value) : el.value; });
    corpo.querySelectorAll('[data-item]').forEach(el => { vi.itens[el.dataset.item] = el.checked; });
    vi.luzes = [...corpo.querySelectorAll('[data-luz]:checked')].map(el => el.dataset.luz);
    corpo.querySelectorAll('[data-mobs]').forEach(el => { if (vi.marcas[+el.dataset.mobs]) vi.marcas[+el.dataset.mobs].obs = el.value; });
  }
  function ligaVistoria(o, v) {
    const sv = $('#croqui'); if (!sv) return;
    const vi = vistoriaDe(o, v);
    const ponto = (el, e, w, h) => { const r = el.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * w), Math.round((e.clientY - r.top) / r.height * h)]; };
    sv.addEventListener('click', e => { const [x, y] = ponto(sv, e, 560, 280); if (x < 24 || x > 536 || y < 44 || y > 236) return; lerDlg(); vi.marcas.push({ x, y, tipo: ferr, obs: '' }); salva(); abrirOS(o.id); });
    const as = $('#assina'); let tr = null, pl = null;
    as.addEventListener('pointerdown', e => { e.preventDefault(); as.setPointerCapture(e.pointerId); tr = ponto(as, e, 400, 120); pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', '#0b1430'); pl.setAttribute('stroke-width', '2.6'); pl.setAttribute('stroke-linecap', 'round'); pl.setAttribute('stroke-linejoin', 'round'); as.appendChild(pl); });
    as.addEventListener('pointermove', e => { if (!tr) return; tr.push(...ponto(as, e, 400, 120)); pl.setAttribute('points', tr.join(' ')); });
    const fim = () => { if (!tr) return; if (tr.length > 4) { vi.assinatura.push(tr); salva(); } tr = null; };
    as.addEventListener('pointerup', fim); as.addEventListener('pointercancel', fim);
  }

  // ---- termo de vistoria (folha para imprimir ou salvar em PDF) ----
  function abrirTermo(id) {
    const o = db.os.find(x => x.id === id), v = veic(o.veiculo), c = cli(v.cliente), vi = vistoriaDe(o, v);
    if ($('#dlg').open) $('#dlg').close();
    let t = $('#termo'); if (!t) { t = document.createElement('div'); t.id = 'termo'; document.body.appendChild(t); }
    t.dataset.os = id;
    const linha = (a, b) => `<div><small>${a}</small><b>${esc(b || '—')}</b></div>`;
    t.innerHTML = `<div class="termo-bar"><span>Termo de vistoria · ${o.id}</span><div><button class="bt" data-imprime>Imprimir ou salvar em PDF</button> <button class="bt p" data-fechatermo>Voltar para a OS</button></div></div>
    <div class="folha">
      <header><div class="lg">PRO<em>CAR</em><small>AR CONDICIONADO AUTOMOTIVO</small></div><div class="tt"><b>Termo de vistoria de entrada</b><span>${o.id} · ${P.data(o.entrada)}/${o.entrada.slice(0, 4)}${vi.hora ? ' · ' + vi.hora : ''}</span></div></header>
      <section class="g2">
        <div class="bl"><h4>Cliente</h4><div class="dl">${linha(c.tipo === 'pj' ? 'Razão social' : 'Nome', c.nome)}${linha(c.tipo === 'pj' ? 'CNPJ' : 'CPF', c.doc)}${linha('Telefone', c.fone)}${linha('E-mail', c.email)}${linha('Endereço', [c.endereco, c.numero].filter(Boolean).join(', ') + (c.bairro ? ' · ' + c.bairro : '') + (c.cidade ? ' · ' + c.cidade + '/' + (c.uf || '') : ''))}</div></div>
        <div class="bl"><h4>Veículo</h4><div class="dl">${linha('Marca e modelo', v.modelo)}${linha('Ano', v.ano + (v.anoModelo ? '/' + v.anoModelo : ''))}${linha('Placa', v.placa)}${linha('Chassi', v.chassi)}${linha('Cor', v.cor)}${linha('Quilometragem', vi.km ? Number(vi.km).toLocaleString('pt-BR') + ' km' : '')}${linha('Combustível', COMB[vi.combustivel])}</div></div>
      </section>
      <section class="g2">
        <div class="bl"><h4>Avarias na entrada</h4>${croqui(vi)}</div>
        <div class="bl"><h4>Apontamentos</h4>${vi.marcas.length ? `<ol class="ap">${vi.marcas.map((k, i) => `<li><i style="background:${TIPOS[k.tipo][2]}">${TIPOS[k.tipo][0]}${i + 1}</i><span><b>${TIPOS[k.tipo][1]}</b> · ${regiao(k.x, k.y)}${k.obs ? '<br>' + esc(k.obs) : ''}</span></li>`).join('')}</ol>` : '<p>Nenhuma avaria aparente registrada.</p>'}
          <h4 style="margin-top:14px">Itens no carro</h4><p class="it">${ITENS.map(([k, n]) => `<span class="${vi.itens[k] ? 'ok' : 'no'}">${vi.itens[k] ? '✓' : '✗'} ${n}</span>`).join('')}</p>
          ${vi.luzes.length ? `<p><b>Luzes acesas no painel:</b> ${vi.luzes.join(', ')}</p>` : ''}${vi.pertences ? `<p><b>Pertences:</b> ${esc(vi.pertences)}</p>` : ''}${vi.obs ? `<p><b>Observações:</b> ${esc(vi.obs)}</p>` : ''}
        </div>
      </section>
      ${Object.keys(vi.fotos || {}).length ? `<section class="ft">${FOTOS.filter(([k]) => vi.fotos[k]).map(([k, n]) => `<figure><img src="${vi.fotos[k]}" alt=""><figcaption>${n}</figcaption></figure>`).join('')}</section>` : ''}
      <p class="decl">Declaro que acompanhei a vistoria e que o veículo foi entregue à Procar nas condições descritas acima. Serviço solicitado: ${esc(o.queixa || '—')}</p>
      <section class="ass"><div>${assinaSvg(vi)}<span>${esc(c.nome)}</span><small>Cliente</small></div><div><div class="resp">${esc(vi.por || o.tecnico || '—')}</div><span>${esc(vi.por || o.tecnico || '')}</span><small>Vistoria · Procar</small></div><div><div class="resp">${esc(o.tecnico || '—')}</div><span>${esc(o.tecnico || '')}</span><small>Responsável pelo carro</small></div></section>
      <footer>Procar · Av. Vasco da Gama, 277 · Federação · Salvador/BA · (71) 3245-1602</footer>
    </div>`;
    t.classList.add('on'); t.scrollTop = 0;
  }

  // ---- ficha do cliente fora da OS ----
  function abrirFicha(vid) {
    const v = veic(vid), c = cli(v.cliente), d = $('#dlg');
    d.dataset.os = ''; d.dataset.veic = vid;
    const hist = db.historico.filter(h => h.veiculo === v.id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6);
    $('#dlg-tit').innerHTML = `Ficha · <span class="mono">${v.placa}</span>`;
    $('#dlg-corpo').innerHTML = abaCadastro(v, c) + (hist.length ? `<div><span class="rot">Histórico deste carro</span><div class="hist-v" style="margin-top:6px">${hist.map(h => `<div><span>${P.data(h.data)} · ${esc(P.servico(h.servico).nome)}</span><span class="mono">${P.reais(h.valor)}</span></div>`).join('')}</div></div>` : '') +
      `<div class="acoes-dlg"><button class="bt p" data-salvaficha>Salvar ficha</button></div>`;
    validaDoc(); if (!d.open) d.showModal();
  }
  const reabrir = () => { const d = $('#dlg'); d.dataset.os ? abrirOS(d.dataset.os) : abrirFicha(d.dataset.veic); };
  const alvoCad = () => { const d = $('#dlg'); const v = d.dataset.os ? veic(db.os.find(x => x.id === d.dataset.os).veiculo) : veic(d.dataset.veic); return [v, cli(v.cliente)]; };

  // ---- CPF, CNPJ (Receita Federal) e CEP ----
  function cpfOk(s) {
    const n = s.replace(/\D/g, ''); if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
    const dv = t => { let x = 0; for (let i = 0; i < t; i++) x += +n[i] * (t + 1 - i); x = x * 10 % 11; return x === 10 ? 0 : x; };
    return dv(9) === +n[9] && dv(10) === +n[10];
  }
  const mascara = (s, pj) => { const n = s.replace(/\D/g, '').slice(0, pj ? 14 : 11); return pj ? n.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2') : n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
  function validaDoc() {
    const el = $('#dlg-corpo [data-c=doc]'), st = $('#stDoc'); if (!el || !st) return;
    if ($('#dlg-corpo [data-c=tipo]').value === 'pj') return;
    const n = el.value.replace(/\D/g, '');
    st.textContent = n.length < 11 ? '' : cpfOk(el.value) ? '✓ CPF válido' : 'CPF não confere. Verifique os números.';
    st.style.color = cpfOk(el.value) ? '#11643a' : 'var(--vermelho)';
  }
  const poe = (k, val) => { const el = $(`#dlg-corpo [data-c="${k}"]`); if (!el || val == null || val === '') return; el.value = val; el.classList.remove('veio'); void el.offsetWidth; el.classList.add('veio'); };
  async function buscaCNPJ() {
    const el = $('#dlg-corpo [data-c=doc]'), st = $('#stDoc'), n = el.value.replace(/\D/g, '');
    if (n.length !== 14) { st.textContent = 'O CNPJ precisa ter 14 números.'; st.style.color = 'var(--vermelho)'; return; }
    st.style.color = 'var(--azul)'; st.textContent = 'Consultando a Receita Federal…';
    try {
      const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + n); if (!r.ok) throw new Error(r.status);
      const j = await r.json(), fone = (j.ddd_telefone_1 || '').replace(/\D/g, '');
      poe('nome', titulo(j.razao_social)); poe('fantasia', titulo(j.nome_fantasia)); poe('situacao', titulo(j.descricao_situacao_cadastral));
      poe('email', (j.email || '').toLowerCase()); poe('fone', fone.length >= 10 ? `${fone.slice(0, 2)} ${fone.slice(2, -4)}-${fone.slice(-4)}` : '');
      poe('cep', String(j.cep || '').replace(/(\d{5})(\d{3})/, '$1-$2')); poe('endereco', titulo([j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' ')));
      poe('numero', j.numero); poe('bairro', titulo(j.bairro)); poe('cidade', titulo(j.municipio)); poe('uf', j.uf);
      const [, c] = alvoCad(); c.atividade = titulo(j.cnae_fiscal_descricao);
      st.style.color = '#11643a'; st.textContent = `✓ Dados da Receita Federal · ${c.atividade || ''}${j.data_inicio_atividade ? ' · aberta em ' + j.data_inicio_atividade.split('-').reverse().join('/') : ''}`;
    } catch (e) { st.style.color = 'var(--vermelho)'; st.textContent = 'Não consegui consultar a Receita agora. Dá para preencher à mão e tentar de novo depois.'; }
  }
  async function buscaCEP(el) {
    const n = el.value.replace(/\D/g, ''); if (n.length !== 8) return;
    el.value = n.replace(/(\d{5})(\d{3})/, '$1-$2');
    try { const r = await fetch('https://brasilapi.com.br/api/cep/v1/' + n); if (!r.ok) return; const j = await r.json(); poe('endereco', j.street); poe('bairro', j.neighborhood); poe('cidade', j.city); poe('uf', j.state); } catch (e) { }
  }

  // ---- equipe ----
  function equipeV() {
    return cab('Equipe', 'Cada carro tem um responsável. Aqui dá para ver quem está com o quê.', `<button class="bt p" data-novofunc>+ Funcionário</button>`) +
      `<div class="eq">${equipe().map(f => {
        const meus = db.os.filter(o => o.tecnico === f.nome);
        const vist = db.os.filter(o => o.vistoria?.feita && o.vistoria.por === f.nome).length;
        return `<div class="cx"><h2><span style="display:flex;align-items:center;gap:10px">${avatar(f.nome)}<span>${esc(f.nome)}<small style="display:block;margin-top:2px">${esc(f.funcao || '')}</small></span></span><small>${meus.length} CARRO(S) · ${vist} VISTORIA(S)</small></h2>
        <div class="lista">${meus.map(o => { const v = veic(o.veiculo); return `<div class="it"><span class="placa">${v.placa}</span><div><b>${esc(v.modelo)}</b><div class="s">${o.id} · ${P.ETAPAS.find(e => e.id === o.etapa).nome} · previsão ${P.data(o.previsao)}</div></div><button class="bt" data-os="${o.id}">Abrir</button></div>`; }).join('') || '<div class="it"><span></span><div class="s">Nenhum carro sob responsabilidade agora.</div></div>'}</div></div>`;
      }).join('')}
      ${db.os.some(o => !o.tecnico) ? `<div class="cx"><h2><span style="display:flex;align-items:center;gap:10px">${avatar('')}Sem responsável</span><small>DEFINIR</small></h2><div class="lista">${db.os.filter(o => !o.tecnico).map(o => { const v = veic(o.veiculo); return `<div class="it"><span class="placa">${v.placa}</span><div><b>${esc(v.modelo)}</b><div class="s">${o.id} · ${P.ETAPAS.find(e => e.id === o.etapa).nome}</div></div><button class="bt p" data-os="${o.id}">Definir</button></div>`; }).join('')}</div></div>` : ''}</div>`;
  }
  function novoFunc() {
    const d = $('#dlg'); d.dataset.os = ''; d.dataset.veic = '';
    $('#dlg-tit').textContent = 'Novo funcionário';
    $('#dlg-corpo').innerHTML = `<form id="fFunc" class="campos"><label class="w2">Nome<input name="nome" required></label><label class="w2">Função<input name="funcao" placeholder="Ex.: Técnico de refrigeração"></label><div class="w4 acoes-dlg"><button class="bt p">Adicionar</button></div></form>`;
    $('#fFunc').addEventListener('submit', e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); equipe().push({ id: 'f' + Date.now(), nome: f.nome.trim(), funcao: f.funcao.trim() }); salva(); d.close(); app(); toast(f.nome + ' entrou na equipe'); });
    d.showModal();
  }

  // ---- planilha (para conferir com o Genius ou mandar para o contador) ----
  function exportar() {
    const cab = ['Cliente', 'CPF/CNPJ', 'Telefone', 'E-mail', 'Endereço', 'Bairro', 'Cidade', 'UF', 'CEP', 'Placa', 'Marca e modelo', 'Ano', 'Chassi', 'Cor', 'KM'];
    const lin = db.veiculos.map(v => { const c = cli(v.cliente); return [c.nome, c.doc, c.fone, c.email, [c.endereco, c.numero].filter(Boolean).join(', '), c.bairro, c.cidade, c.uf, c.cep, v.placa, v.modelo, v.ano, v.chassi, v.cor, v.km]; });
    const csv = '﻿' + [cab, ...lin].map(l => l.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'procar-clientes-e-carros.csv'; a.click();
    toast('Planilha baixada: abre no Excel');
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return; const d = t.dataset;
    if (d.aba) { lerDlg(); salva(); aba = d.aba; abrirOS($('#dlg').dataset.os); }
    else if (d.ferr) { ferr = d.ferr; document.querySelectorAll('[data-ferr]').forEach(b => b.setAttribute('aria-pressed', b === t)); }
    else if (d.comb !== undefined) { const o = lerDlg(); o.vistoria.combustivel = +d.comb; salva(); t.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === t)); }
    else if (d.rmmarca !== undefined) { const o = lerDlg(); o.vistoria.marcas.splice(+d.rmmarca, 1); salva(); abrirOS(o.id); }
    else if (d.limpaass !== undefined) { const o = lerDlg(); o.vistoria.assinatura = []; salva(); abrirOS(o.id); }
    else if (d.concluivist) { const o = lerDlg(), vi = o.vistoria; if (!vi.feita) { vi.feita = true; vi.hora = new Date().toTimeString().slice(0, 5); } salva(); app(); abrirTermo(o.id); toast('Vistoria registrada na ' + o.id); }
    else if (d.termo) { lerDlg(); salva(); abrirTermo(d.termo); }
    else if (d.fechatermo !== undefined) { const t2 = $('#termo'); t2.classList.remove('on'); abrirOS(t2.dataset.os); }
    else if (d.imprime !== undefined) window.print();
    else if (d.cnpj !== undefined) buscaCNPJ();
    else if (d.ficha) abrirFicha(d.ficha);
    else if (d.salvaficha !== undefined) { const [v, c] = alvoCad(); lerCadastro(v, c); salva(); $('#dlg').close(); app(); toast('Ficha salva'); }
    else if (d.exporta !== undefined) exportar();
    else if (d.novofunc !== undefined) novoFunc();
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.c === 'tipo') { const [v, c] = alvoCad(); lerCadastro(v, c); c.doc = ''; salva(); reabrir(); }
    else if (el.dataset.c === 'cep') buscaCEP(el);
    else if (el.dataset.foto) {
      const arq = el.files[0]; if (!arq) return; const o = lerDlg(), img = new Image();
      img.onload = () => { const k = Math.min(1, 640 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); o.vistoria.fotos[el.dataset.foto] = cv.toDataURL('image/jpeg', .6); salva(); abrirOS(o.id); };
      img.src = URL.createObjectURL(arq);
    }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.c === 'doc') { el.value = mascara(el.value, $('#dlg-corpo [data-c=tipo]').value === 'pj'); validaDoc(); }
  });

  logado() ? app() : login();
})();

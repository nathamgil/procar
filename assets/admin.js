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
    ['clientes', 'Clientes e carros', '◎'], ['retornos', 'Retornos', '↻'],
    ['estoque', 'Estoque', '▣'], ['relatorios', 'Relatórios', '▲']
  ];
  let view = 'hoje', filtro = '';

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
    $('#main').innerHTML = ({ hoje, patio, agenda, clientes, retornos: retornosV, estoque, relatorios })[view]();
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
      <div class="pe"><span>${o.tecnico ? '🔧 ' + esc(o.tecnico) : 'sem técnico'}</span><span>${o.itens.length ? P.reais(totOS(o)) : '—'}</span></div>
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
  function abrirOS(id) {
    const o = db.os.find(x => x.id === id), v = veic(o.veiculo), c = cli(v.cliente);
    const hist = db.historico.filter(h => h.veiculo === v.id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
    $('#dlg-tit').innerHTML = `${o.id} · <span class="mono">${v.placa}</span>`;
    $('#dlg-corpo').innerHTML = `
      <div class="campos">
        <label class="w2">Cliente<input value="${esc(c.nome)}" disabled></label>
        <label>WhatsApp<input value="${esc(c.fone)}" disabled></label>
        <label>Veículo<input value="${esc(v.modelo)} ${v.ano}" disabled></label>
        <label>Etapa<select data-f="etapa">${P.ETAPAS.map(e => `<option value="${e.id}" ${e.id === o.etapa ? 'selected' : ''}>${e.nome}</option>`).join('')}</select></label>
        <label>Técnico<select data-f="tecnico">${['', 'Anderson', 'Rafael'].map(t => `<option ${t === o.tecnico ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Gás<input value="${v.gas}" disabled></label>
        <label>Previsão<input type="date" data-f="previsao" value="${o.previsao}"></label>
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
    const dlg = $('#dlg'); dlg.dataset.os = id;
    atualizaEnvio(o, v, c);
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
    o.itens = [...$('#itens').querySelectorAll('.l')].map(l => ({ desc: l.querySelector('[data-it=desc]').value, tipo: l.querySelector('[data-it=tipo]').value, valor: +l.querySelector('[data-it=valor]').value || 0 })).filter(i => i.desc);
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
      <label class="w4">Queixa<input name="queixa" value="${esc(ag?.sintoma || '')}" placeholder="O que o cliente relatou"></label>
      <div class="w4 acoes-dlg"><button class="bt p">Abrir OS</button></div></form>`;
    $('#fNova').addEventListener('submit', e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      const placa = P.placa(f.placa);
      let v = db.veiculos.find(x => x.placa === placa);
      if (!v) {
        const c = { id: 'c' + Date.now(), nome: f.nome, fone: f.fone, origem: ag ? ag.origem : 'Balcão' }; db.clientes.push(c);
        v = { id: 'v' + Date.now(), cliente: c.id, placa, modelo: f.modelo, ano: +f.ano || '', gas: f.gas }; db.veiculos.push(v);
      }
      const n = Math.max(...db.os.map(o => +o.id.slice(3))) + 1;
      db.os.unshift({ id: 'OS-' + n, veiculo: v.id, etapa: 'recebido', entrada: hojeS, previsao: P.dia(1), queixa: f.queixa, tecnico: '', baixa: null, alta: null, saidaAntes: null, saidaDepois: null, diagnostico: '', itens: [], aprovado: false });
      if (ag) ag.status = 'entrou';
      salva(); $('#dlg').close(); view = 'patio'; app(); toast(`OS-${n} aberta para ${placa}`);
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
    }).filter(l => !q || (l.v.placa + l.v.modelo + l.c.nome).toLowerCase().includes(q)).sort((a, b) => b.gasto - a.gasto);
    return cab('Clientes e carros', `${db.clientes.length} clientes · ${db.veiculos.length} carros. Cada placa guarda o histórico inteiro.`, `<input class="busca-in" placeholder="Buscar placa, carro ou nome" value="${esc(filtro)}" data-filtro>`) +
      `<div class="cx"><table class="t"><thead><tr><th>Placa</th><th>Carro</th><th>Cliente</th><th>Origem</th><th>Último serviço</th><th style="text-align:right">Visitas</th><th style="text-align:right">Total gasto</th><th></th></tr></thead><tbody>
      ${linhas.map(l => `<tr><td><span class="placa">${l.v.placa}</span></td><td><b>${esc(l.v.modelo)}</b> ${l.v.ano} <span class="tag">${l.v.gas}</span></td><td>${esc(l.c.nome)}</td><td>${l.c.origem === 'Frota' ? '<span class="tag a">Frota</span>' : esc(l.c.origem)}</td><td>${l.ult ? P.data(l.ult.data) + ' · ' + esc(P.servico(l.ult.servico).nome) : '—'}</td><td class="n">${l.n}</td><td class="n">${P.reais(l.gasto)}</td><td><a class="bt z" target="_blank" rel="noopener" href="${zap(l.c.fone, `Oi, ${l.c.nome.split(' ')[0]}! Aqui é da Procar.`)}">WhatsApp</a></td></tr>`).join('')}
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
    else if (d.os && !t.closest('dialog')) abrirOS(d.os);
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

  logado() ? app() : login();
})();

const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];
export function fmt(n, dec = 2) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, dec);
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1).replace(/\.0$/, '') : Math.floor(n).toString();
  let e = Math.floor(Math.log10(n) / 3);
  let v = n / Math.pow(1000, e);
  if (v >= 999.995) { v /= 1000; e++; }
  let s;
  if (e < SUF.length) s = SUF[e];
  else { const k = e - SUF.length; s = String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + k % 26); }
  return (v >= 100 ? v.toFixed(Math.min(dec, 1)) : v.toFixed(dec)).replace(/\.0+$/, '') + s;
}
export const money = (n) => '$' + fmt(n);
export function time(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return m + 'm ' + String(s).padStart(2, '0') + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const PT = /^pt/i.test(navigator.language || '');
export const lang = PT ? 'pt' : 'en';
const S = {
  play: ['Play', 'Jogar'],
  loading: ['Warming up the ovens…', 'Aquecendo os fornos…'],
  perSec: ['/s', '/s'],
  lv: ['Lv', 'Nv'],
  upgrade: ['Upgrade', 'Melhorar'],
  build: ['Build', 'Construir'],
  hire: ['Hire', 'Contratar'],
  tapToBake: ['Tap to bake!', 'Toque para produzir!'],
  managers: ['Managers', 'Gerentes'],
  upgrades: ['Upgrades', 'Melhorias'],
  stars: ['Stars', 'Estrelas'],
  boosts: ['Boosts', 'Turbos'],
  settings: ['Settings', 'Ajustes'],
  close: ['Close', 'Fechar'],
  sound: ['Sound', 'Som'],
  music: ['Music', 'Música'],
  on: ['On', 'Lig.'], off: ['Off', 'Desl.'],
  reset: ['Reset progress', 'Apagar progresso'],
  resetSure: ['Tap again to erase everything', 'Toque de novo para apagar tudo'],
  credits: ['3D models: Kenney (CC0). Fonts: Lilita One, Nunito (SIL OFL). Made with AI.', 'Modelos 3D: Kenney (CC0). Fontes: Lilita One, Nunito (SIL OFL). Feito com IA.'],
  mgrDesc: ['Runs this line on its own, even while you are away.', 'Opera a linha sozinho, mesmo quando você está fora.'],
  hired: ['Hired', 'Contratado'],
  lineLocked: ['Build this line first', 'Construa esta linha primeiro'],
  profitX: ['profit ×', 'lucro ×'],
  allProfitX: ['All lines profit ×', 'Lucro de todas as linhas ×'],
  bought: ['bought', 'compradas'],
  noUpgrades: ['All upgrades bought!', 'Todas as melhorias compradas!'],
  speedX: ['speed ×', 'velocidade ×'],
  next: ['Next', 'Próximo'],
  milestone: ['Milestone', 'Marco'],
  sellTitle: ['Open a new factory', 'Abrir nova fábrica'],
  sellBody: ['Sell this factory to start over with Chef Stars. Each unspent star gives +2% profit forever. Lines, levels, managers and upgrades reset.', 'Venda esta fábrica para recomeçar com Estrelas de Chef. Cada estrela não gasta dá +2% de lucro para sempre. Linhas, níveis, gerentes e melhorias recomeçam.'],
  sellBtn: ['Sell & restart', 'Vender e recomeçar'],
  sellNeed: ['Earn more to gain stars', 'Ganhe mais para obter estrelas'],
  starsOwned: ['Stars', 'Estrelas'],
  bonus: ['Bonus', 'Bônus'],
  claim: ['Stars if you sell now', 'Estrelas se vender agora'],
  perks: ['Star perks (spending stars lowers the bonus)', 'Vantagens (gastar estrelas reduz o bônus)'],
  perk_offline: ['Longer shifts', 'Turnos longos'], perk_offline_d: ['+2h offline earnings cap', '+2h no limite offline'],
  perk_mgrcost: ['Cheaper managers', 'Gerentes baratos'], perk_mgrcost_d: ['Managers cost 25% less', 'Gerentes 25% mais baratos'],
  perk_rush: ['Long rush', 'Turbo longo'], perk_rush_d: ['Rush boost lasts 50% longer', 'O turbo dura 50% mais'],
  perk_start: ['Starting funds', 'Capital inicial'], perk_start_d: ['Start each factory with more cash', 'Comece cada fábrica com mais dinheiro'],
  perk_profit: ['Secret recipe', 'Receita secreta'], perk_profit_d: ['All profits ×2', 'Todo lucro ×2'],
  max: ['MAX', 'MÁX'],
  buy: ['buy', 'comprar'],
  rushTitle: ['Rush hour', 'Hora do rush'],
  rushDesc: ['All profits ×2 for {m} minutes (stacks up to 4h).', 'Todo lucro ×2 por {m} minutos (acumula até 4h).'],
  warpTitle: ['Time warp', 'Salto no tempo'],
  warpDesc: ['Get 30 minutes of income right now.', 'Receba 30 minutos de renda agora.'],
  watch: ['Watch', 'Assistir'],
  adFail: ['Video not available right now. Try again later.', 'Vídeo indisponível agora. Tente mais tarde.'],
  adSkip: ['Video closed early, no reward.', 'Vídeo fechado antes do fim, sem prêmio.'],
  cooldown: ['Ready in', 'Pronto em'],
  welcome: ['Welcome back!', 'Bem-vindo de volta!'],
  awayFor: ['Your managers worked for {t}', 'Seus gerentes trabalharam por {t}'],
  collect: ['Collect', 'Coletar'],
  collectX2: ['Collect ×2', 'Coletar ×2'],
  goal: ['Goal', 'Meta'],
  nextStar: ['Next star at {n} total earnings', 'Próxima estrela com {n} ganhos no total'],
  crateTitle: ['Crate of parts', 'Caixa de peças'],
  crateDesc: ['+{n} free levels on {line}.', '+{n} níveis grátis em {line}.'],
  reward: ['Reward', 'Prêmio'],
  goalDone: ['Goal complete!', 'Meta concluída!'],
  g_tap: ['Make {n} cookies by hand', 'Produza {n} cookies na mão'],
  g_lvl: ['Get {line} to level {n}', 'Leve {line} ao nível {n}'],
  g_build: ['Build the {line} line', 'Construa a linha de {line}'],
  g_mgr: ['Hire a manager for {line}', 'Contrate um gerente para {line}'],
  g_up: ['Buy {n} upgrades', 'Compre {n} melhorias'],
  g_up1: ['Buy an upgrade', 'Compre uma melhoria'],
  g_earn: ['Earn {n} in this factory', 'Ganhe {n} nesta fábrica'],
  g_sell: ['Sell the factory for stars', 'Venda a fábrica por estrelas'],
  golden: ['Golden crate!', 'Caixa dourada!'],
  frenzy: ['Sugar frenzy! Profits ×3', 'Frenesi doce! Lucro ×3'],
  newLine: ['New line built!', 'Nova linha construída!'],
  milestoneHit: ['{line} milestone: {what}', 'Marco em {line}: {what}'],
  allMilestone: ['All lines reached {n}: profits ×2!', 'Todas as linhas no {n}: lucro ×2!'],
  mgrHired: ['{line} manager hired!', 'Gerente de {line} contratado!'],
  tut1: ['Tap the cookie line to bake', 'Toque na linha de cookies para produzir'],
  tut2: ['Upgrade the line to earn more per batch', 'Melhore a linha para ganhar mais por lote'],
  tut3: ['Hire a manager so the line runs by itself', 'Contrate um gerente para a linha rodar sozinha'],
  tut4: ['Build a new production line', 'Construa uma nova linha de produção'],
  soldOut: ['Factory sold! +{n} stars', 'Fábrica vendida! +{n} estrelas'],
  income: ['income', 'renda'],
  howTo: ['How to play', 'Como jogar'],
  howToBody: ['Tap a line to make a batch. Upgrade lines to earn more; every milestone level makes them faster. Hire managers to automate lines — they keep working while you are away. When your factory slows down, sell it for Chef Stars and grow even faster.', 'Toque numa linha para produzir um lote. Melhore as linhas para ganhar mais; cada marco de nível as deixa mais rápidas. Contrate gerentes para automatizar — eles trabalham mesmo quando você está fora. Quando a fábrica desacelerar, venda-a por Estrelas de Chef e cresça ainda mais rápido.'],
  lines: {
    cookie: ['Cookies', 'Cookies'], donut: ['Donuts', 'Donuts'], cupcake: ['Cupcakes', 'Cupcakes'], croissant: ['Croissants', 'Croissants'],
    waffle: ['Waffles', 'Waffles'], burger: ['Burgers', 'Hambúrgueres'], pizza: ['Pizzas', 'Pizzas'], sushi: ['Sushi', 'Sushi'],
    sundae: ['Sundaes', 'Sundaes'], cake: ['Party cakes', 'Bolos de festa'],
  },
  mgrNames: [['Bea', 'Bea'], ['Theo', 'Théo'], ['Ana', 'Ana'], ['Kofi', 'Kofi'], ['Mei', 'Mei'], ['Lucas', 'Lucas'], ['Zara', 'Zara'], ['Ravi', 'Ravi'], ['Nina', 'Nina'], ['Omar', 'Omar']],
};
const L = PT ? 1 : 0;
export function t(key, vars) {
  let s = S[key]; s = s ? s[L] : key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
export const lineName = (id) => S.lines[id][L];
export const mgrName = (i) => S.mgrNames[i][L];

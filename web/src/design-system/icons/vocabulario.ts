import {
  Activity,
  AlarmClock,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  Bell,
  BellRing,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarSync,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  CircleSlash,
  Clock,
  Columns3,
  Copy,
  Cpu,
  Database,
  Download,
  Euro,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  Gauge,
  Globe,
  GripVertical,
  Handshake,
  HardDrive,
  History,
  Info,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  List,
  ListTodo,
  Lock,
  LogOut,
  Mail,
  MemoryStick,
  MessageSquare,
  Minus,
  Monitor,
  Moon,
  MoreHorizontal,
  MonitorCog,
  Network,
  OctagonAlert,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  ReceiptEuro,
  RefreshCw,
  Repeat,
  Search,
  Server,
  Settings,
  Sun,
  ShieldAlert,
  ShieldCheck,
  Tags,
  Terminal,
  Timer,
  TrendingUp,
  TriangleAlert,
  Truck,
  Trash2,
  Users,
  UserRound,
  UserRoundCheck,
  Wifi,
  WifiOff,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/*
| O vocabulário de ícones da casa. Fonte ÚNICA.
|
| Nada fora deste ficheiro importa `lucide-react` — e a razão não é estilo, é
| divergência. A biblioteca tem 1500 desenhos e há uma dúzia que servem
| «cliente»; com o import solto, cada ecrã escolhe o seu e ao fim de um mês há
| quatro clientes diferentes no mesmo produto. Aqui a escolha é feita uma vez e
| o compilador impede a segunda.
|
| Acrescentar uma entrada é barato e é o caminho certo. Importar o lucide
| directamente noutro ficheiro é o que não se faz.
|
| ⚠ UMA excepção, e só uma: as páginas de amostra do `apps/ds` importam o
| lucide à cabeça (`layout`, `overlays`, `primitivas`, `shell`). São montras
| de componentes, e os ícones que lá aparecem são adereços do exemplo, não
| escolhas de produto — obrigá-las a passar por aqui enchia este ficheiro de
| entradas que só servem demonstrações. **Código de produto não tem esta
| excepção**: em `apps/web` e no resto do design system, o import solto é que
| reabre a divergência que isto veio fechar.
*/
export const ICONES = {
  // Navegação — uma entrada por destino do menu.
  visaoGeral: LayoutDashboard,
  alertas: Bell,
  asMinhas: UserRoundCheck,
  tarefas: ListTodo,
  fluxo: Workflow,
  esforco: Timer,
  /*
    As duas do menu do Xavier, com desenhos que o vocabulário já tinha.

    `sprints` fica com o calendário em ciclo das avenças: uma sprint é um bloco
    de tempo que se repete, que é o que o desenho diz. Não colide no ecrã —
    avenças só existem no menu do hulk, sprints só no do Xavier.

    `capacidade` fica com o manómetro do `disco`, que não é destino de menu
    nenhum: a pergunta da página é quanto da equipa já está ocupado, e um
    mostrador a encher é essa pergunta.
  */
  sprints: CalendarSync,
  capacidade: Gauge,
  conteudos: FileText,
  etiquetas: Tags,
  projectos: FolderKanban,
  clientes: Building2,
  comercial: TrendingUp,
  infraestrutura: Server,
  financeiro: Euro,
  avencas: CalendarSync,
  fornecedores: Truck,
  equipa: Users,
  eu: UserRound,
  linhaDeComandos: Terminal,
  avisos: BellRing,
  aparencia: Palette,
  temaClaro: Sun,
  temaEscuro: Moon,
  temaSistema: MonitorCog,
  ecraDeParede: Monitor,

  /*
    Estado e severidade — o vocabulário do `feedback.json`.

    CINCO formas diferentes, e isso não é enfeite: a escala inteira era lida só
    pela COR, e quem não distingue vermelho de laranja não a lia de todo. Na
    primeira versão deste ficheiro o `grave` e o `aviso` apontavam ambos para o
    triângulo — o mesmo defeito, cometido de novo dentro da correcção dele.

    O octógono do `critico` não é escolha nova: era o que o design system tinha
    desenhado à mão em `overlays/internals.tsx`, deliberadamente mais distinto
    que os círculos à volta. Voltou.
  */
  critico: OctagonAlert,
  grave: TriangleAlert,
  aviso: CircleAlert,
  info: Info,
  bom: CircleCheck,
  semDados: CircleDashed,
  neutro: Circle,
  suspenso: CircleSlash,

  // Infraestrutura.
  servidor: Server,
  dominio: Globe,
  site: Layers,
  alojamento: Boxes,
  armazenamento: HardDrive,
  baseDeDados: Database,
  rede: Network,
  processador: Cpu,
  memoria: MemoryStick,
  disco: Gauge,
  alcancavel: Wifi,
  inalcancavel: WifiOff,
  certificado: ShieldCheck,
  semCertificado: ShieldAlert,
  actividade: Activity,
  energia: Zap,

  // Negócio e dinheiro.
  lead: Handshake,
  projecto: Briefcase,
  factura: ReceiptEuro,
  dinheiro: Banknote,
  folha: FileSpreadsheet,
  pacote: Package,

  // Controlos de interface.
  fechar: X,
  abrir: Plus,
  remover: Trash2,
  editar: Pencil,
  procurar: Search,
  filtrar: Filter,
  sincronizar: RefreshCw,
  definicoes: Settings,
  sair: LogOut,
  mais: MoreHorizontal,
  arrastar: GripVertical,
  copiar: Copy,
  descarregar: Download,
  ligacaoExterna: ExternalLink,
  ligacao: Link2,
  anexo: Paperclip,
  comentario: MessageSquare,
  visivel: Eye,
  escondido: EyeOff,
  trancado: Lock,
  credencial: KeyRound,
  correio: Mail,
  ajuda: CircleHelp,
  visto: Check,
  traco: Minus,

  // Direcção e desdobramento.
  expandir: ChevronDown,
  recolher: ChevronUp,
  seguinte: ChevronRight,
  anterior: ChevronLeft,
  primeiro: ChevronsLeft,
  ultimo: ChevronsRight,
  paraCima: ArrowUp,
  paraBaixo: ArrowDown,
  paraEsquerda: ArrowLeft,
  paraDireita: ArrowRight,
  paraFora: ArrowUpRight,
  barraFechar: PanelLeftClose,
  barraAbrir: PanelLeftOpen,

  // Vistas e tempo.
  ordenar: ChevronsUpDown,
  vistaLista: List,
  vistaQuadro: Columns3,
  vistaGrelha: LayoutGrid,
  calendario: CalendarDays,
  relogio: Clock,
  /*
    Um lembrete não é um alerta. O `Bell` já serve «alertas» e o `BellRing`
    serve «avisos» — dar-lhe um dos dois punha três conceitos no mesmo
    desenho, que é o defeito que este ficheiro existe para evitar.
  */
  lembrete: AlarmClock,

  /*
    Contar tempo, e parar de contar.

    Duas entradas e não uma que roda: o `relogio` já diz «tempo» e é o que
    marca uma duração no ecrã. Estas duas são a ACÇÃO, e são um par —
    `contar`/`pausar` alternam no mesmo botão, como o play/pause de qualquer
    leitor. Dar ao arranque o `Clock` punha o mesmo desenho a dizer «isto é
    tempo» e «carrega aqui para começar», que é a confusão que este ficheiro
    evita.
  */
  contar: Play,
  pausar: Pause,

  /*
    Repetir não é sincronizar. O `RefreshCw` do `sincronizar` é ir buscar o
    que mudou lá fora; isto é a tarefa voltar sozinha no calendário.
  */
  repeticao: Repeat,

  /*
    O registo do que mudou numa coisa, ao longo do tempo. Distinto do
    `actividade` (`Activity`), que é o pulso de um sistema agora.
  */
  historico: History,
} as const satisfies Record<string, LucideIcon>;

export type NomeDeIcone = keyof typeof ICONES;

/*
| A severidade tinha CINCO cópias.
|
| `BoardArrastavel`, `PlaneadorDeSprint`, `QuadroDeTarefas`, `ListaDeTarefas` e
| `Indicadores` declaravam cada um a sua tabela de prioridade, com os mesmos
| quatro valores e símbolos que já não batiam certo entre si (o `low` era `▽`
| em três ficheiros e `○` noutro). Passa a haver uma.
|
| As chaves são as do `feedback.json` — `good` · `warning` · `serious` ·
| `critical` · `info` — porque a cor já vinha de lá e ter duas listas de nomes
| para a mesma escala é como isto começou.
*/
export const ICONE_DE_SEVERIDADE = {
  critical: ICONES.critico,
  serious: ICONES.grave,
  warning: ICONES.aviso,
  info: ICONES.info,
  good: ICONES.bom,
} as const satisfies Record<string, LucideIcon>;

export type Severidade = keyof typeof ICONE_DE_SEVERIDADE;

/*
| A prioridade de uma tarefa não é a severidade de um alerta, ainda que as duas
| se pintem com as mesmas cores. Um alerta crítico é um facto sobre o mundo;
| uma tarefa urgente é uma escolha de quem a pôs lá. Mapa próprio, e a `low`
| ganha um desenho em vez do triângulo virado ao contrário — `▽` não é «baixa»
| em lado nenhum senão neste repo.
*/
export const ICONE_DE_PRIORIDADE = {
  urgent: ICONES.critico,
  high: ICONES.grave,
  medium: ICONES.neutro,
  low: ICONES.paraBaixo,
} as const satisfies Record<string, LucideIcon>;

export type Prioridade = keyof typeof ICONE_DE_PRIORIDADE;

/*
| Estado de um servidor, alojamento ou site.
|
| O `●` servia `operational`, `critical` E `unreachable`, distinguidos só pela
| cor — o que reprova para quem não distingue vermelho de verde, e é a razão
| pela qual isto passa a ter formas diferentes e não só tintas diferentes.
*/
export const ICONE_DE_ESTADO = {
  operational: ICONES.bom,
  attention: ICONES.aviso,
  critical: ICONES.critico,
  unreachable: ICONES.inalcancavel,
  suspended: ICONES.suspenso,
  unknown: ICONES.semDados,
} as const satisfies Record<string, LucideIcon>;

export type EstadoDeServico = keyof typeof ICONE_DE_ESTADO;

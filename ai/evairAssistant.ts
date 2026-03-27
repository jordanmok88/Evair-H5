interface KnowledgeEntry {
  keywords: string[];
  keywords_zh?: string[];
  keywords_es?: string[];
  response: string;
  response_zh?: string;
  response_es?: string;
  followUp?: string;
  followUp_zh?: string;
  followUp_es?: string;
}

type DetectedLang = 'en' | 'zh' | 'es';

function detectLanguage(text: string): DetectedLang {
  const zhChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  if (zhChars && zhChars.length >= 2) return 'zh';
  const esPatterns = /\b(hola|gracias|ayuda|necesito|quiero|problema|envío|activar|cómo|dónde|cuánto|tarjeta|reembolso|factura|precio|datos|pago)\b/i;
  if (esPatterns.test(text)) return 'es';
  return 'en';
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ['activate', 'activation', 'how to activate', 'start', 'turn on', 'enable'],
    keywords_zh: ['激活', '怎么激活', '启用', '打开', '开通', '开卡'],
    keywords_es: ['activar', 'activación', 'cómo activar', 'encender', 'habilitar'],
    response:
      "To activate your EvairSIM:\n\n" +
      "📱 **eSIM**: Tap your eSIM card in My eSIMs, then tap \"Install\" to see the QR code and step-by-step instructions.\n\n" +
      "⚠️ **Important**: eSIM profiles can only be installed **once**. Do not delete it from your device after installation.\n\n" +
      "💳 **Physical SIM (US only)**: Insert the card, open the Evair app, go to SIM Card tab > Set Up Now, and scan/enter your ICCID to bind it to your account.\n\n" +
      "Activation is usually instant for eSIMs and takes up to 5 minutes for physical SIMs.",
    response_zh:
      "激活您的 EvairSIM：\n\n" +
      "📱 **eSIM**：在'我的 eSIM'中点击您的卡片，然后点击'安装'查看二维码和安装步骤。\n\n" +
      "⚠️ **重要提示**：eSIM 配置文件只能安装**一次**。安装后请勿从设备中删除。\n\n" +
      "💳 **实体 SIM 卡（仅限美国）**：插入卡片，打开 Evair 应用，前往 SIM 卡标签 > 立即设置，扫描或输入 ICCID 绑定到您的账户。\n\n" +
      "eSIM 通常即时激活，实体 SIM 卡最多需要 5 分钟。",
    response_es:
      "Para activar tu EvairSIM:\n\n" +
      "📱 **eSIM**: Toca tu tarjeta en Mis eSIMs, luego toca \"Instalar\" para ver el código QR e instrucciones.\n\n" +
      "⚠️ **Importante**: Los perfiles eSIM solo se pueden instalar **una vez**. No lo elimines después de la instalación.\n\n" +
      "💳 **SIM física (solo EE.UU.)**: Inserta la tarjeta, abre la app Evair, ve a SIM Card > Configurar ahora, y escanea/ingresa tu ICCID.\n\n" +
      "La activación es instantánea para eSIMs y tarda hasta 5 minutos para SIMs físicas.",
    followUp: "Would you like step-by-step instructions for your specific device?",
    followUp_zh: "需要针对您手机型号的详细教程吗？",
    followUp_es: "¿Te gustaría instrucciones paso a paso para tu dispositivo?",
  },
  {
    keywords: ['iccid', 'eid', 'number', 'where is iccid', 'find iccid', 'card number', 'serial', 'barcode'],
    keywords_zh: ['卡号', '序列号', '在哪找', 'ICCID在哪', '条形码'],
    keywords_es: ['número de tarjeta', 'número serial', 'dónde está', 'código de barras'],
    response:
      "Your ICCID (Integrated Circuit Card Identifier) is a unique 19-20 digit number printed on your physical SIM card. You can find it:\n\n" +
      "1️⃣ **On the SIM card** — printed below the barcode\n" +
      "2️⃣ **On the card holder** — next to the punch-out area\n" +
      "3️⃣ **In your device** — Settings > About Phone > SIM Status\n\n" +
      "For eSIMs, the EID is shown in Settings > General > About on iOS.",
    response_zh:
      "ICCID（集成电路卡标识符）是印在实体 SIM 卡上的 19-20 位唯一编号。您可以在以下位置找到：\n\n" +
      "1️⃣ **SIM 卡上** — 印在条形码下方\n" +
      "2️⃣ **卡托上** — 在卡槽旁边\n" +
      "3️⃣ **手机中** — 设置 > 关于手机 > SIM 卡状态\n\n" +
      "eSIM 的 EID 可以在 iOS 的 设置 > 通用 > 关于本机 中查看。",
    response_es:
      "Tu ICCID es un número único de 19-20 dígitos impreso en tu tarjeta SIM física. Puedes encontrarlo:\n\n" +
      "1️⃣ **En la tarjeta SIM** — impreso debajo del código de barras\n" +
      "2️⃣ **En el soporte de la tarjeta** — junto al área de corte\n" +
      "3️⃣ **En tu dispositivo** — Ajustes > Acerca del teléfono > Estado de la SIM\n\n" +
      "Para eSIMs, el EID se muestra en Ajustes > General > Información en iOS.",
  },
  {
    keywords: ['install esim', 'setup esim', 'qr code', 'scan', 'add esim', 'esim setup', 'how to install'],
    keywords_zh: ['安装', '设置eSIM', '二维码', '扫描', '添加eSIM', '怎么安装'],
    keywords_es: ['instalar esim', 'configurar esim', 'código qr', 'escanear', 'añadir esim', 'cómo instalar'],
    response:
      "To install your eSIM:\n\n" +
      "**iPhone (iOS 12.1+):**\n" +
      "1. Go to Settings > Cellular > Add Cellular Plan\n" +
      "2. Scan the QR code from your confirmation email\n" +
      "3. Label it (e.g., \"Travel\")\n" +
      "4. Turn on Data Roaming under Cellular Data Options\n\n" +
      "**Android:**\n" +
      "1. Go to Settings > Network & Internet > SIMs\n" +
      "2. Tap \"Add eSIM\" or \"Download SIM\"\n" +
      "3. Scan the QR code\n\n" +
      "💡 Make sure you're connected to WiFi during installation.\n\n" +
      "⚠️ **One-time installation only** — your eSIM can only be installed once. If you delete it from your device, it cannot be recovered and you would need to purchase a new one.",
    response_zh:
      "安装您的 eSIM：\n\n" +
      "**iPhone (iOS 12.1+)：**\n" +
      "1. 前往 设置 > 蜂窝网络 > 添加蜂窝号码方案\n" +
      "2. 扫描确认邮件中的二维码\n" +
      "3. 为其命名（如'旅行'）\n" +
      "4. 在蜂窝数据选项中打开数据漫游\n\n" +
      "**安卓：**\n" +
      "1. 前往 设置 > 网络和互联网 > SIM 卡\n" +
      "2. 点击'添加 eSIM'或'下载 SIM'\n" +
      "3. 扫描二维码\n\n" +
      "💡 安装过程中请确保连接 WiFi。\n\n" +
      "⚠️ **仅可安装一次** — 您的 eSIM 只能安装一次。如果从设备中删除，将无法恢复，您需要重新购买。",
    response_es:
      "Para instalar tu eSIM:\n\n" +
      "**iPhone (iOS 12.1+):**\n" +
      "1. Ve a Ajustes > Datos móviles > Añadir plan celular\n" +
      "2. Escanea el código QR de tu email de confirmación\n" +
      "3. Ponle un nombre (ej: \"Viaje\")\n" +
      "4. Activa Roaming de datos\n\n" +
      "**Android:**\n" +
      "1. Ve a Ajustes > Red e Internet > SIMs\n" +
      "2. Toca \"Añadir eSIM\" o \"Descargar SIM\"\n" +
      "3. Escanea el código QR\n\n" +
      "💡 Asegúrate de estar conectado a WiFi durante la instalación.\n\n" +
      "⚠️ **Instalación única** — tu eSIM solo se puede instalar una vez. Si lo eliminas, no se puede recuperar.",
  },
  {
    keywords: ['compatible', 'compatibility', 'support', 'supported', 'work with', 'which phone', 'device', 'iphone', 'android', 'samsung', 'pixel', 'does my phone'],
    keywords_zh: ['兼容', '支持', '哪些手机', '适用', '能用吗', '我的手机'],
    keywords_es: ['compatible', 'compatibilidad', 'soporta', 'funciona con', 'qué teléfono', 'dispositivo'],
    response:
      "EvairSIM eSIM is compatible with most modern smartphones:\n\n" +
      "✅ **iPhone**: XS, XR, 11, 12, 13, 14, 15, 16 and newer\n" +
      "✅ **Samsung**: Galaxy S20+ and newer, Galaxy Z series\n" +
      "✅ **Google Pixel**: Pixel 3a and newer\n" +
      "✅ **iPad**: Pro (3rd gen+), Air (3rd gen+), Mini (5th gen+)\n\n" +
      "⚠️ Your device must be **carrier-unlocked** to use EvairSIM.\n\n" +
      "Physical SIM cards & Evair eCard work with any unlocked device that accepts nano-SIM — even phones without built-in eSIM support!",
    response_zh:
      "EvairSIM eSIM 兼容大多数现代智能手机：\n\n" +
      "✅ **iPhone**：XS、XR、11、12、13、14、15、16 及更新机型\n" +
      "✅ **三星**：Galaxy S20+ 及更新、Galaxy Z 系列\n" +
      "✅ **Google Pixel**：Pixel 3a 及更新\n" +
      "✅ **iPad**：Pro（第3代+）、Air（第3代+）、Mini（第5代+）\n\n" +
      "⚠️ 您的设备必须是**无锁版**才能使用 EvairSIM。\n\n" +
      "实体 SIM 卡和 Evair eCard 适用于任何支持 nano-SIM 的无锁设备 — 即使手机不支持内置 eSIM！",
    response_es:
      "EvairSIM eSIM es compatible con la mayoría de smartphones modernos:\n\n" +
      "✅ **iPhone**: XS, XR, 11, 12, 13, 14, 15, 16 y posteriores\n" +
      "✅ **Samsung**: Galaxy S20+ y posteriores, serie Galaxy Z\n" +
      "✅ **Google Pixel**: Pixel 3a y posteriores\n\n" +
      "⚠️ Tu dispositivo debe estar **desbloqueado** para usar EvairSIM.\n\n" +
      "Las SIMs físicas y Evair eCard funcionan con cualquier dispositivo desbloqueado que acepte nano-SIM — ¡incluso sin eSIM integrado!",
  },
  {
    keywords: ['data', 'top up', 'topup', 'recharge', 'more data', 'add data', 'ran out', 'gb', 'usage', 'how much data', 'data left', 'remaining'],
    keywords_zh: ['流量', '充值', '续费', '加流量', '用完了', '还剩多少', '剩余流量', '数据'],
    keywords_es: ['datos', 'recargar', 'más datos', 'agregar datos', 'se acabó', 'cuántos datos', 'datos restantes'],
    response:
      "You can check and manage your data in the Evair app:\n\n" +
      "📊 **Check remaining data**: Go to My eSIMs/SIMs tab — the data donut shows your usage at a glance.\n\n" +
      "➕ **Top up**: Tap \"Add Data\" on your active SIM to purchase additional data packages.\n\n" +
      "📌 **Reloadable plans**: Some plans support top-ups — you can add data before your current plan expires.\n" +
      "📌 **Non-reloadable plans**: These have a fixed allowance and cannot be topped up. You'll need to purchase a new plan when data runs out.\n\n" +
      "Top-up packs are available in various sizes (1GB, 3GB, 5GB, 10GB+) and durations (7, 15, 30 days). Prices vary by country.",
    response_zh:
      "您可以在 Evair 应用中查看和管理流量：\n\n" +
      "📊 **查看剩余流量**：前往'我的 SIM 卡'标签页 — 流量圆环直观显示使用量。\n\n" +
      "➕ **充值**：点击已激活 SIM 卡上的'添加流量'，购买额外流量包。\n\n" +
      "📌 **可充值套餐**：部分套餐支持充值 — 您可以在当前套餐到期前添加流量。\n" +
      "📌 **不可充值套餐**：这类套餐有固定流量，用完后需要购买新套餐。\n\n" +
      "充值包有多种规格（1GB、3GB、5GB、10GB+）和时长（7、15、30天）。价格因国家而异。",
    response_es:
      "Puedes verificar y gestionar tus datos en la app Evair:\n\n" +
      "📊 **Ver datos restantes**: Ve a la pestaña Mis SIMs — el indicador circular muestra tu uso.\n\n" +
      "➕ **Recargar**: Toca \"Agregar datos\" en tu SIM activa para comprar paquetes adicionales.\n\n" +
      "📌 **Planes recargables**: Algunos planes permiten recargas — puedes agregar datos antes de que expire.\n" +
      "📌 **Planes no recargables**: Tienen una cantidad fija; necesitarás comprar un plan nuevo.\n\n" +
      "Los paquetes vienen en varios tamaños (1GB, 3GB, 5GB, 10GB+) y duraciones (7, 15, 30 días). Los precios varían por país.",
  },
  {
    keywords: ['price', 'pricing', 'cost', 'how much', 'plan', 'plans', 'cheap', 'expensive', 'discount', 'offer', 'promotion', '50%', 'first order'],
    keywords_zh: ['价格', '多少钱', '套餐', '便宜', '贵', '优惠', '折扣', '促销', '首单'],
    keywords_es: ['precio', 'cuánto cuesta', 'plan', 'planes', 'barato', 'caro', 'descuento', 'oferta', 'promoción'],
    response:
      "EvairSIM offers competitive pricing with coverage in 190+ countries:\n\n" +
      "🎉 **New customer?** Get 50% OFF your first order!\n\n" +
      "We have two product types:\n\n" +
      "📱 **eSIM plans** (single-country & multi-country):\n" +
      "• 1 GB / 7 days — from $0.99\n" +
      "• 3 GB / 30 days — from $3.99\n" +
      "• 5 GB / 30 days — from $7.50\n" +
      "• 10 GB / 30 days — from $12.50\n" +
      "• Multi-country plans also available!\n\n" +
      "💳 **Physical SIM plans** (US data only):\n" +
      "• US plans start from $8.99\n\n" +
      "All plans include hotspot sharing and 5G/4G LTE where available. Prices vary by country and plan duration.",
    response_zh:
      "EvairSIM 提供覆盖 190+ 国家的超值套餐：\n\n" +
      "🎉 **新用户？** 首单享受5折优惠！\n\n" +
      "两种产品类型：\n\n" +
      "📱 **eSIM 套餐**（单国/多国）：\n" +
      "• 1 GB / 7 天 — 低至 $0.99\n" +
      "• 3 GB / 30 天 — 低至 $3.99\n" +
      "• 5 GB / 30 天 — 低至 $7.50\n" +
      "• 10 GB / 30 天 — 低至 $12.50\n" +
      "• 还有多国套餐可选！\n\n" +
      "💳 **实体 SIM 卡套餐**（仅限美国数据）：\n" +
      "• 美国套餐起价 $8.99\n\n" +
      "所有套餐均支持热点共享和 5G/4G LTE。价格因国家和时长而异。",
    response_es:
      "EvairSIM ofrece precios competitivos con cobertura en más de 190 países:\n\n" +
      "🎉 **¿Cliente nuevo?** ¡50% de descuento en tu primer pedido!\n\n" +
      "Dos tipos de productos:\n\n" +
      "📱 **Planes eSIM** (un país y multi-país):\n" +
      "• 1 GB / 7 días — desde $0.99\n" +
      "• 3 GB / 30 días — desde $3.99\n" +
      "• 5 GB / 30 días — desde $7.50\n" +
      "• 10 GB / 30 días — desde $12.50\n\n" +
      "💳 **Planes SIM física** (solo datos de EE.UU.):\n" +
      "• Planes desde $8.99\n\n" +
      "Todos incluyen hotspot y 5G/4G LTE donde esté disponible.",
  },
  {
    keywords: ['network', 'coverage', 'country', 'countries', 'roaming', 'signal', '5g', '4g', 'lte', 'speed', 'slow'],
    keywords_zh: ['网络', '覆盖', '国家', '漫游', '信号', '网速', '慢', '速度'],
    keywords_es: ['red', 'cobertura', 'país', 'países', 'roaming', 'señal', 'velocidad', 'lento'],
    response:
      "EvairSIM covers 190+ countries and regions worldwide:\n\n" +
      "🌍 We partner with top local carriers in each country to ensure the best coverage.\n\n" +
      "• **Speed**: 4G LTE / 5G (where available)\n" +
      "• **Hotspot**: Supported on all plans\n" +
      "• **Roaming**: Seamless — no extra charges\n\n" +
      "You can browse all supported countries and their network partners in the Shop tab.",
    response_zh:
      "EvairSIM 覆盖全球 190+ 个国家和地区：\n\n" +
      "🌍 我们与各国顶级本地运营商合作，确保最佳覆盖。\n\n" +
      "• **速度**：4G LTE / 5G（视地区而定）\n" +
      "• **热点**：所有套餐均支持\n" +
      "• **漫游**：无缝切换，无额外费用\n\n" +
      "您可以在商店标签页浏览所有支持的国家和运营商。",
    response_es:
      "EvairSIM cubre más de 190 países y regiones:\n\n" +
      "🌍 Nos asociamos con los mejores operadores locales en cada país.\n\n" +
      "• **Velocidad**: 4G LTE / 5G (donde esté disponible)\n" +
      "• **Hotspot**: Soportado en todos los planes\n" +
      "• **Roaming**: Sin cargos adicionales\n\n" +
      "Puedes ver todos los países en la pestaña Tienda.",
  },
  {
    keywords: ['not working', 'doesnt work', "doesn't work", 'problem', 'issue', 'error', 'fail', 'failed', 'help', 'trouble', 'no service', 'no signal', 'no internet', 'cant connect', "can't connect", 'fix'],
    keywords_zh: ['不能用', '不工作', '没信号', '问题', '错误', '失败', '没网', '连不上', '没有服务', '修复', '帮助', '故障'],
    keywords_es: ['no funciona', 'problema', 'error', 'falla', 'sin servicio', 'sin señal', 'sin internet', 'no puedo conectar', 'arreglar'],
    response:
      "Let's troubleshoot your EvairSIM issue:\n\n" +
      "1️⃣ **Toggle Airplane Mode** on/off\n" +
      "2️⃣ **Check Data Roaming** is turned ON:\n" +
      "   • iOS: Settings > Cellular > Cellular Data Options > Data Roaming\n" +
      "   • Android: Settings > Network > Mobile Data > Roaming\n" +
      "3️⃣ **Select network manually**: Settings > Carrier > turn off Automatic, then pick a supported carrier\n" +
      "4️⃣ **Restart your device**\n" +
      "5️⃣ Make sure your plan hasn't expired (check in My SIMs tab)\n\n" +
      "If the issue persists, please share your device model and country — I'll help further!",
    response_zh:
      "让我们排查您的 EvairSIM 问题：\n\n" +
      "1️⃣ **开关飞行模式**\n" +
      "2️⃣ **检查数据漫游**是否已打开：\n" +
      "   • iOS：设置 > 蜂窝网络 > 蜂窝数据选项 > 数据漫游\n" +
      "   • 安卓：设置 > 网络 > 移动数据 > 漫游\n" +
      "3️⃣ **手动选择网络**：设置 > 运营商 > 关闭自动，选择支持的运营商\n" +
      "4️⃣ **重启手机**\n" +
      "5️⃣ 确认套餐是否已过期（在'我的 SIM 卡'中查看）\n\n" +
      "如果问题持续，请告诉我您的手机型号和所在国家，我会进一步帮助您！",
    response_es:
      "Solucionemos tu problema con EvairSIM:\n\n" +
      "1️⃣ **Activa/desactiva modo avión**\n" +
      "2️⃣ **Verifica que Roaming de datos** esté activado\n" +
      "3️⃣ **Selecciona la red manualmente**: Ajustes > Operador > desactiva Automático\n" +
      "4️⃣ **Reinicia tu dispositivo**\n" +
      "5️⃣ Verifica que tu plan no haya expirado\n\n" +
      "Si el problema persiste, comparte tu modelo de dispositivo y país — ¡te ayudaré!",
  },
  {
    keywords: ['bill', 'billing', 'payment', 'pay', 'charge', 'charged', 'receipt', 'invoice', 'credit card', 'transaction', 'stripe', 'apple pay', 'double charge'],
    keywords_zh: ['账单', '付款', '支付', '扣费', '收据', '发票', '信用卡', '交易', '账单问题', '重复扣费', '多扣了'],
    keywords_es: ['factura', 'pago', 'cobro', 'recibo', 'tarjeta de crédito', 'transacción', 'cobro doble'],
    response:
      "Regarding billing and payments:\n\n" +
      "💳 **Payment methods**: We accept all major credit/debit cards via Stripe, plus Apple Pay and Google Pay.\n\n" +
      "🧾 **Receipts**: Sent automatically to your email after purchase. You can also view order history in Profile > Orders.\n\n" +
      "💰 **Double charge?** If you see a duplicate charge:\n" +
      "1. Check if it's a pending authorization (these auto-release in 3-7 days)\n" +
      "2. If confirmed duplicate, share the transaction date, amount, and order number\n" +
      "3. We'll investigate and process a refund within 3-5 business days\n\n" +
      "For refund requests, just type \"refund\" or ask me about our refund policy!",
    response_zh:
      "关于账单和付款：\n\n" +
      "💳 **支付方式**：我们通过 Stripe 接受所有主流信用卡/借记卡，以及 Apple Pay 和 Google Pay。\n\n" +
      "🧾 **收据**：购买后自动发送到您的邮箱。您也可以在 个人中心 > 订单 中查看。\n\n" +
      "💰 **重复扣费？** 如果您看到重复扣款：\n" +
      "1. 检查是否是待处理的预授权（通常 3-7 天自动释放）\n" +
      "2. 如确认重复扣费，请提供交易日期、金额和订单号\n" +
      "3. 我们将在 3-5 个工作日内调查并处理退款\n\n" +
      "需要退款？输入'退款'或询问我们的退款政策！",
    response_es:
      "Sobre facturación y pagos:\n\n" +
      "💳 **Métodos de pago**: Aceptamos tarjetas vía Stripe, Apple Pay y Google Pay.\n\n" +
      "🧾 **Recibos**: Se envían automáticamente a tu email.\n\n" +
      "💰 **¿Cobro doble?**\n" +
      "1. Verifica si es una autorización pendiente (se libera en 3-7 días)\n" +
      "2. Si es duplicado, comparte fecha, monto y número de pedido\n" +
      "3. Investigaremos y procesaremos el reembolso en 3-5 días hábiles\n\n" +
      "¿Necesitas un reembolso? ¡Escribe \"reembolso\" o pregúntame!",
  },
  {
    keywords: ['refund', 'money back', 'get refund', 'want refund', 'refund policy', 'return', 'refund process', 'how to refund', 'request refund'],
    keywords_zh: ['退款', '退钱', '怎么退款', '退款政策', '想退款', '要退款', '退费', '退回', '申请退款', '退款流程'],
    keywords_es: ['reembolso', 'devolver dinero', 'política de reembolso', 'quiero reembolso', 'solicitar reembolso', 'proceso de reembolso'],
    response:
      "Here's our refund policy:\n\n" +
      "✅ **Eligible for full refund (within 30 days)**:\n" +
      "• eSIM purchased but **NOT yet installed/activated**\n" +
      "• Physical SIM ordered but **NOT yet shipped**\n" +
      "• Duplicate/accidental purchases\n\n" +
      "⚠️ **Partial refund or credit (case-by-case)**:\n" +
      "• eSIM installed but experienced persistent technical issues\n" +
      "• Physical SIM received but defective\n\n" +
      "❌ **Not eligible for refund**:\n" +
      "• eSIM installed and data has been used\n" +
      "• Plan has expired\n\n" +
      "**How to request a refund**:\n" +
      "1. Provide your **order number** or **email address**\n" +
      "2. Tell us the **reason** for the refund\n" +
      "3. We'll process it within **3-5 business days** back to your original payment method\n\n" +
      "Would you like to request a refund? Please share your order details.",
    response_zh:
      "以下是我们的退款政策：\n\n" +
      "✅ **可全额退款（购买后 30 天内）**：\n" +
      "• eSIM 已购买但**尚未安装/激活**\n" +
      "• 实体 SIM 卡已下单但**尚未发货**\n" +
      "• 重复/误操作购买\n\n" +
      "⚠️ **部分退款或抵扣（视情况而定）**：\n" +
      "• eSIM 已安装但持续出现技术问题\n" +
      "• 实体 SIM 卡已收到但存在缺陷\n\n" +
      "❌ **不可退款**：\n" +
      "• eSIM 已安装且已使用数据\n" +
      "• 套餐已过期\n\n" +
      "**如何申请退款**：\n" +
      "1. 提供您的**订单号**或**注册邮箱**\n" +
      "2. 告诉我们**退款原因**\n" +
      "3. 我们将在 **3-5 个工作日内**退回到您的原支付方式\n\n" +
      "需要申请退款吗？请提供您的订单信息。",
    response_es:
      "Nuestra política de reembolso:\n\n" +
      "✅ **Reembolso completo (dentro de 30 días)**:\n" +
      "• eSIM comprada pero **NO instalada/activada**\n" +
      "• SIM física pedida pero **NO enviada**\n" +
      "• Compras duplicadas/accidentales\n\n" +
      "⚠️ **Reembolso parcial o crédito (caso por caso)**:\n" +
      "• eSIM instalada pero con problemas técnicos persistentes\n" +
      "• SIM física recibida pero defectuosa\n\n" +
      "❌ **No elegible**:\n" +
      "• eSIM instalada y datos usados\n" +
      "• Plan expirado\n\n" +
      "**Cómo solicitar reembolso**:\n" +
      "1. Proporciona tu **número de pedido** o **email**\n" +
      "2. Dinos el **motivo**\n" +
      "3. Procesaremos en **3-5 días hábiles**\n\n" +
      "¿Quieres solicitar un reembolso? Comparte los detalles de tu pedido.",
    followUp: "Please share your order number and reason for the refund, and I'll get this started for you.",
    followUp_zh: "请提供您的订单号和退款原因，我会立即为您处理。",
    followUp_es: "Comparte tu número de pedido y motivo del reembolso, y lo procesaré de inmediato.",
  },
  {
    keywords: ['ship', 'shipping', 'delivery', 'deliver', 'arrive', 'tracking', 'physical', 'mail', 'how long'],
    keywords_zh: ['快递', '发货', '配送', '到货', '物流', '追踪', '寄', '多久到', '运费'],
    keywords_es: ['envío', 'entrega', 'llegar', 'rastreo', 'correo', 'cuánto tarda'],
    response:
      "Physical SIM card shipping details:\n\n" +
      "📦 **Currently available**: US shipping only\n" +
      "🚀 **Processing time**: 1-2 business days\n" +
      "📬 **US delivery**: 3-5 business days via USPS/UPS\n\n" +
      "Tracking info is sent via email once your order ships. You can also check your tracking number in the app under SIM Card > Track My Order.\n\n" +
      "💡 Need it today? Our **eSIM** is delivered instantly — no waiting for mail!\n\n" +
      "🌍 We're also available on **Amazon** and other marketplaces for convenient US shipping.",
    response_zh:
      "实体 SIM 卡配送详情：\n\n" +
      "📦 **目前可用**：仅限美国境内配送\n" +
      "🚀 **处理时间**：1-2 个工作日\n" +
      "📬 **美国配送**：通过 USPS/UPS 3-5 个工作日\n\n" +
      "发货后会通过邮件发送物流追踪信息。您也可以在应用中 SIM 卡 > 追踪订单 查看物流。\n\n" +
      "💡 急需使用？我们的 **eSIM** 即时交付 — 无需等待快递！\n\n" +
      "🌍 也可以在 **Amazon** 等电商平台购买。",
    response_es:
      "Detalles de envío de tarjeta SIM física:\n\n" +
      "📦 **Disponible actualmente**: Solo envío en EE.UU.\n" +
      "🚀 **Tiempo de procesamiento**: 1-2 días hábiles\n" +
      "📬 **Entrega en EE.UU.**: 3-5 días hábiles vía USPS/UPS\n\n" +
      "💡 ¿Lo necesitas hoy? Nuestro **eSIM** se entrega al instante.\n\n" +
      "🌍 También disponible en **Amazon** para envío conveniente.",
  },
  {
    keywords: ['expire', 'expiry', 'expiration', 'validity', 'valid', 'how long last', 'duration', 'renew', 'extend'],
    keywords_zh: ['过期', '有效期', '到期', '多长时间', '续期', '延长', '有效'],
    keywords_es: ['expirar', 'vencimiento', 'validez', 'cuánto dura', 'duración', 'renovar', 'extender'],
    response:
      "Your data plan validity depends on the plan type:\n\n" +
      "⏱️ **Most eSIM plans**: Validity starts when you first use data in your destination country (not when you purchase).\n\n" +
      "💳 **Physical SIM plans**: Validity starts from the moment the profile is enabled/activated.\n\n" +
      "📅 **Check expiry**: Open My eSIMs/SIMs tab — the expiry date and remaining data are shown on your SIM card details.\n\n" +
      "📌 **Plan durations**: Available in 7, 15, 30, 60, 90, and 180-day options depending on the country.\n\n" +
      "You can purchase a new plan or top up (if reloadable) before your current one expires to keep your connection active.",
    response_zh:
      "套餐有效期取决于套餐类型：\n\n" +
      "⏱️ **大多数 eSIM 套餐**：有效期从到达目的地国家首次使用数据时开始计算（非购买时）。\n\n" +
      "💳 **实体 SIM 卡套餐**：有效期从配置文件启用/激活时开始。\n\n" +
      "📅 **查看到期时间**：打开'我的 SIM 卡'标签页，卡片详情中显示到期日期和剩余流量。\n\n" +
      "📌 **套餐时长**：根据国家不同，有 7、15、30、60、90、180 天等选择。\n\n" +
      "您可以在当前套餐到期前购买新套餐或充值（可充值套餐），以保持网络连接。",
    response_es:
      "La validez del plan depende del tipo:\n\n" +
      "⏱️ **Mayoría de planes eSIM**: La validez comienza cuando usas datos por primera vez en tu país de destino.\n\n" +
      "💳 **Planes SIM física**: La validez comienza al activar el perfil.\n\n" +
      "📅 **Ver vencimiento**: Abre la pestaña Mis SIMs.\n\n" +
      "📌 **Duraciones**: 7, 15, 30, 60, 90 y 180 días según el país.\n\n" +
      "Puedes comprar un nuevo plan o recargar (si es recargable) antes de que expire.",
  },
  {
    keywords: ['hotspot', 'tether', 'tethering', 'share', 'wifi', 'share data', 'personal hotspot'],
    keywords_zh: ['热点', '共享', '分享网络', '个人热点', 'WiFi共享'],
    keywords_es: ['hotspot', 'compartir', 'wifi', 'compartir datos', 'punto de acceso'],
    response:
      "Yes! All EvairSIM plans support hotspot/tethering at no extra cost. 🎉\n\n" +
      "To enable it:\n" +
      "• **iPhone**: Settings > Personal Hotspot > Allow Others to Join\n" +
      "• **Android**: Settings > Hotspot & Tethering > Wi-Fi Hotspot\n\n" +
      "Make sure EvairSIM is selected as your data line if you have multiple SIMs.",
    response_zh:
      "是的！所有 EvairSIM 套餐均免费支持热点共享。🎉\n\n" +
      "开启方法：\n" +
      "• **iPhone**：设置 > 个人热点 > 允许其他人加入\n" +
      "• **安卓**：设置 > 热点与网络共享 > WiFi 热点\n\n" +
      "如果您有多张 SIM 卡，请确保选择 EvairSIM 作为数据线路。",
    response_es:
      "¡Sí! Todos los planes EvairSIM soportan hotspot sin costo adicional. 🎉\n\n" +
      "Para activarlo:\n" +
      "• **iPhone**: Ajustes > Hotspot personal > Permitir a otros unirse\n" +
      "• **Android**: Ajustes > Hotspot y anclaje > Hotspot Wi-Fi\n\n" +
      "Asegúrate de que EvairSIM esté seleccionado como tu línea de datos.",
  },
  {
    keywords: ['account', 'profile', 'login', 'log in', 'sign in', 'password', 'email', 'change email', 'change password', 'forgot password', 'delete account'],
    keywords_zh: ['账户', '账号', '登录', '密码', '邮箱', '修改密码', '忘记密码', '注销', '删除账户'],
    keywords_es: ['cuenta', 'perfil', 'iniciar sesión', 'contraseña', 'correo', 'cambiar contraseña', 'olvidé contraseña', 'eliminar cuenta'],
    response:
      "For account-related actions:\n\n" +
      "👤 **View/Edit profile**: Profile tab > Account Information\n" +
      "🔒 **Change password**: Profile tab > Account Information > Edit (under password)\n" +
      "📧 **Change email**: Contact our support team — email changes require verification.\n" +
      "🔑 **Forgot password**: Tap \"Forgot Password\" on the login screen and we'll send a reset link.\n" +
      "🗑️ **Delete account**: Profile tab > Account Information > Delete Account (at the bottom).",
    response_zh:
      "账户相关操作：\n\n" +
      "👤 **查看/编辑资料**：个人中心 > 账户信息\n" +
      "🔒 **修改密码**：个人中心 > 账户信息 > 编辑（密码部分）\n" +
      "📧 **修改邮箱**：请联系客服团队 — 更换邮箱需要验证。\n" +
      "🔑 **忘记密码**：在登录页面点击'忘记密码'，我们会发送重置链接。\n" +
      "🗑️ **注销账户**：个人中心 > 账户信息 > 删除账户（在页面底部）。",
    response_es:
      "Para acciones de cuenta:\n\n" +
      "👤 **Ver/Editar perfil**: Perfil > Información de la cuenta\n" +
      "🔒 **Cambiar contraseña**: Perfil > Información de la cuenta > Editar\n" +
      "📧 **Cambiar email**: Contacta a nuestro equipo de soporte.\n" +
      "🔑 **Olvidé contraseña**: Toca \"Olvidé mi contraseña\" en la pantalla de inicio de sesión.\n" +
      "🗑️ **Eliminar cuenta**: Perfil > Información de la cuenta > Eliminar cuenta.",
  },
  {
    keywords: ['cancel', 'cancellation', 'cancel order', 'cancel plan', 'stop'],
    keywords_zh: ['取消', '取消订单', '退订', '不要了'],
    keywords_es: ['cancelar', 'cancelación', 'cancelar pedido', 'cancelar plan'],
    response:
      "Regarding cancellations:\n\n" +
      "• **eSIM not yet activated**: You can request a full refund — just share your order number.\n" +
      "• **eSIM already activated**: Unfortunately, activated eSIMs cannot be cancelled, but unused data can sometimes be credited toward a new plan.\n" +
      "• **Physical SIM in transit**: Can be cancelled before shipment for a full refund.\n\n" +
      "Would you like me to help you with a specific cancellation?",
    response_zh:
      "关于取消订单：\n\n" +
      "• **eSIM 尚未激活**：可以申请全额退款 — 请提供您的订单号。\n" +
      "• **eSIM 已激活**：很抱歉，已激活的 eSIM 无法取消，但未使用的流量有时可以抵扣新套餐。\n" +
      "• **实体 SIM 卡在运送中**：发货前可以取消并全额退款。\n\n" +
      "需要我帮您处理具体的取消请求吗？",
    response_es:
      "Sobre cancelaciones:\n\n" +
      "• **eSIM no activada**: Puedes solicitar un reembolso completo — solo comparte tu número de pedido.\n" +
      "• **eSIM ya activada**: Lamentablemente no se puede cancelar, pero los datos no usados pueden acreditarse.\n" +
      "• **SIM física en tránsito**: Se puede cancelar antes del envío.\n\n" +
      "¿Te gustaría que te ayude con una cancelación específica?",
  },
  {
    keywords: ['human', 'agent', 'real person', 'speak to someone', 'talk to person', 'live chat', 'representative', 'operator', 'transfer'],
    keywords_zh: ['人工', '客服', '真人', '转接', '找人', '人工客服', '在线客服'],
    keywords_es: ['humano', 'agente', 'persona real', 'hablar con alguien', 'representante', 'operador', 'transferir'],
    response:
      "I understand you'd like to speak with a human agent. 🙋‍♂️\n\n" +
      "I've flagged your conversation for our support team. A live agent will join this chat shortly — our typical response time is within 2 hours during business hours.\n\n" +
      "In the meantime, feel free to describe your issue in detail so the agent can assist you faster when they connect!",
    response_zh:
      "我理解您想与人工客服交流。🙋‍♂️\n\n" +
      "已为您转接到客服团队。真人客服将很快加入对话 — 工作时间内通常 2 小时内回复。\n\n" +
      "在等待期间，请详细描述您的问题，这样客服接入后可以更快地帮助您！",
    response_es:
      "Entiendo que te gustaría hablar con un agente humano. 🙋‍♂️\n\n" +
      "He marcado tu conversación para nuestro equipo. Un agente se unirá pronto — tiempo de respuesta típico: 2 horas en horario laboral.\n\n" +
      "Mientras tanto, describe tu problema en detalle para que el agente pueda ayudarte más rápido.",
  },
  {
    keywords: ['multiple', 'dual sim', 'two sim', 'switch', 'more than one', 'several', 'another sim'],
    keywords_zh: ['多张卡', '双卡', '切换', '换卡', '另一张'],
    keywords_es: ['múltiple', 'doble sim', 'dos sim', 'cambiar', 'otra sim'],
    response:
      "Yes, you can use multiple EvairSIM plans simultaneously!\n\n" +
      "📱 **Dual SIM devices**: Keep your primary SIM for calls and use EvairSIM for data.\n\n" +
      "✈️ **Multiple destinations**: Purchase separate plans for each country, or choose a regional/global plan.\n\n" +
      "All your SIMs are managed in the My eSIMs/SIMs tab where you can switch between them easily.",
    response_zh:
      "是的，您可以同时使用多张 EvairSIM！\n\n" +
      "📱 **双卡设备**：保留主卡打电话，用 EvairSIM 上网。\n\n" +
      "✈️ **多个目的地**：为每个国家购买独立套餐，或选择地区/全球套餐。\n\n" +
      "所有 SIM 卡都在'我的 SIM 卡'标签页中管理，可轻松切换。",
    response_es:
      "¡Sí, puedes usar múltiples planes EvairSIM simultáneamente!\n\n" +
      "📱 **Dual SIM**: Mantén tu SIM principal para llamadas y usa EvairSIM para datos.\n\n" +
      "✈️ **Múltiples destinos**: Compra planes separados o elige un plan regional/global.\n\n" +
      "Todas tus SIMs se gestionan en la pestaña Mis SIMs.",
  },
  {
    keywords: ['what is evair', 'about evair', 'who are you', 'tell me about', 'evairsim', 'evair sim'],
    keywords_zh: ['什么是', '关于', '你是谁', '介绍', 'Evair是什么'],
    keywords_es: ['qué es evair', 'sobre evair', 'quién eres', 'cuéntame sobre'],
    response:
      "EvairSIM provides affordable mobile data for travelers worldwide! 🌍\n\n" +
      "🔹 **190+ countries** covered\n" +
      "🔹 **eSIM & Physical SIM** options\n" +
      "🔹 **Instant activation** for eSIMs\n" +
      "🔹 **50% off** your first order\n" +
      "🔹 **5G/4G LTE** speeds with hotspot\n" +
      "🔹 **No roaming fees** — pay once, use anywhere\n\n" +
      "Browse plans in the Shop tab or ask me anything specific!",
    response_zh:
      "EvairSIM 为全球旅行者提供实惠的移动数据服务！🌍\n\n" +
      "🔹 覆盖 **190+ 个国家**\n" +
      "🔹 **eSIM 和实体 SIM 卡**两种选择\n" +
      "🔹 eSIM **即时激活**\n" +
      "🔹 首单 **5 折优惠**\n" +
      "🔹 **5G/4G LTE** 网速，支持热点\n" +
      "🔹 **无漫游费** — 一次付费，随处使用\n\n" +
      "在商店标签页浏览套餐，或随时向我提问！",
    response_es:
      "¡EvairSIM ofrece datos móviles asequibles para viajeros! 🌍\n\n" +
      "🔹 Cobertura en **más de 190 países**\n" +
      "🔹 Opciones de **eSIM y SIM física**\n" +
      "🔹 **Activación instantánea** para eSIMs\n" +
      "🔹 **50% de descuento** en tu primer pedido\n" +
      "🔹 Velocidades **5G/4G LTE** con hotspot\n" +
      "🔹 **Sin cargos de roaming**\n\n" +
      "¡Explora planes en la pestaña Tienda o pregúntame lo que quieras!",
  },
  {
    keywords: ['ecard', 'e-card', 'evair ecard', 'what is ecard', 'physical esim', 'esim card', 'esim chip', 'euicc'],
    keywords_zh: ['eCard', '实体eSIM', 'eSIM卡', '芯片卡', 'eUICC'],
    keywords_es: ['ecard', 'tarjeta esim', 'chip esim', 'esim física'],
    response:
      "**Evair eCard** is a revolutionary physical SIM card with an embedded eUICC chip — it brings eSIM technology to ANY phone, even those without built-in eSIM support.\n\n" +
      "🔹 Simply insert the eCard like a regular nano-SIM card\n" +
      "🔹 The eSIM profiles are **pre-loaded** at the factory — no need to download\n" +
      "🔹 Just bind the card in the Evair app and start using data\n" +
      "🔹 Works on both **Android** and **iPhone**\n" +
      "🔹 Supports **5G** networks\n\n" +
      "It uses eUICC technology (GSMA SGP.22 standard), the same tech inside modern smartphones but in a physical nano-SIM form factor.",
    response_zh:
      "**Evair eCard** 是一张内置 eUICC 芯片的革命性实体 SIM 卡 — 让任何手机都能使用 eSIM 技术，即使手机不支持内置 eSIM。\n\n" +
      "🔹 像普通 nano-SIM 卡一样插入即可\n" +
      "🔹 eSIM 配置文件由工厂**预装** — 无需下载\n" +
      "🔹 在 Evair 应用中绑定卡片即可开始使用\n" +
      "🔹 **安卓**和 **iPhone** 都支持\n" +
      "🔹 支持 **5G** 网络\n\n" +
      "采用 eUICC 技术（GSMA SGP.22 标准），与现代智能手机内置的 eSIM 技术相同，但以实体 nano-SIM 形态呈现。",
    response_es:
      "**Evair eCard** es una tarjeta SIM física revolucionaria con chip eUICC — trae la tecnología eSIM a CUALQUIER teléfono.\n\n" +
      "🔹 Solo insértala como una nano-SIM normal\n" +
      "🔹 Los perfiles están **precargados** de fábrica\n" +
      "🔹 Vincula la tarjeta en la app y empieza a usar datos\n" +
      "🔹 Funciona en **Android** y **iPhone**\n" +
      "🔹 Soporta redes **5G**",
    followUp: "Would you like to know how to set up an eCard, or check which plans are available?",
    followUp_zh: "想了解如何设置 eCard，或者查看有哪些可用套餐吗？",
    followUp_es: "¿Quieres saber cómo configurar un eCard o ver qué planes hay disponibles?",
  },
  {
    keywords: ['amazon', 'marketplace', 'temu', 'bought online', 'bought from', 'third party', 'ebay', 'already have sim', 'received sim', 'got my sim'],
    keywords_zh: ['亚马逊', '电商', '第三方', '已收到', '拿到卡了', '淘宝', '拼多多'],
    keywords_es: ['amazon', 'mercado', 'tercero', 'ya recibí', 'compré en'],
    response:
      "Welcome! If you purchased your EvairSIM from Amazon or another marketplace, here's how to get started:\n\n" +
      "1️⃣ **Create an account**: Open the Evair app and sign up with your email\n" +
      "2️⃣ **Bind your SIM**: Go to the SIM Card tab > \"Set Up Now\"\n" +
      "3️⃣ **Scan or enter ICCID**: The 19-20 digit number on your SIM card\n" +
      "4️⃣ **Start using data**: Insert the SIM and you're ready to go!\n\n" +
      "Your SIM card comes pre-activated with an eSIM profile. Just bind it to your account to manage your data and top up.",
    response_zh:
      "欢迎！如果您在亚马逊或其他电商平台购买了 EvairSIM，以下是开始使用的步骤：\n\n" +
      "1️⃣ **创建账户**：打开 Evair 应用，使用邮箱注册\n" +
      "2️⃣ **绑定 SIM 卡**：前往 SIM 卡标签 > '立即设置'\n" +
      "3️⃣ **扫描或输入 ICCID**：SIM 卡上的 19-20 位数字\n" +
      "4️⃣ **开始使用**：插入 SIM 卡即可使用数据！\n\n" +
      "您的 SIM 卡已预装 eSIM 配置文件，只需绑定到您的账户即可管理流量和充值。",
    response_es:
      "¡Bienvenido! Si compraste tu EvairSIM en Amazon u otro marketplace:\n\n" +
      "1️⃣ **Crear cuenta**: Abre la app Evair y regístrate\n" +
      "2️⃣ **Vincular SIM**: Ve a SIM Card > \"Configurar ahora\"\n" +
      "3️⃣ **Escanear ICCID**: El número de 19-20 dígitos en tu tarjeta\n" +
      "4️⃣ **Empezar**: Inserta la SIM y listo!\n\n" +
      "Tu SIM viene pre-activada. Solo vincúlala a tu cuenta para gestionar tus datos.",
  },
  {
    keywords: ['delete esim', 'remove esim', 'uninstall esim', 'deleted esim', 'accidentally deleted', 'lost esim', 'reinstall', 'recover esim', 'restore esim'],
    keywords_zh: ['删除eSIM', '卸载eSIM', '误删', '恢复eSIM', '重新安装', '丢失', 'eSIM没了'],
    keywords_es: ['eliminar esim', 'borrar esim', 'desinstalar', 'eliminé accidentalmente', 'recuperar esim', 'restaurar'],
    response:
      "⚠️ **Important warning about eSIM deletion**:\n\n" +
      "eSIM profiles can only be installed **ONE TIME**. If you delete/remove an eSIM from your device, it **cannot be recovered or reinstalled**.\n\n" +
      "If you accidentally deleted your eSIM:\n" +
      "• Unfortunately, the profile cannot be restored\n" +
      "• You would need to purchase a new eSIM plan\n" +
      "• Contact our support team — we may be able to offer a discount on a replacement\n\n" +
      "💡 **Pro tip**: If you're not traveling, you can simply **disable** the eSIM in your phone settings instead of deleting it. This keeps the profile safe for future use.",
    response_zh:
      "⚠️ **关于删除 eSIM 的重要警告**：\n\n" +
      "eSIM 配置文件只能安装**一次**。如果从设备中删除 eSIM，将**无法恢复或重新安装**。\n\n" +
      "如果您不小心删除了 eSIM：\n" +
      "• 很遗憾，配置文件无法恢复\n" +
      "• 您需要购买新的 eSIM 套餐\n" +
      "• 请联系客服团队 — 我们可能会为补购提供折扣\n\n" +
      "💡 **小技巧**：如果暂时不旅行，可以在手机设置中**停用** eSIM，而不是删除它。这样配置文件会保留以备将来使用。",
    response_es:
      "⚠️ **Advertencia importante sobre eliminar eSIM**:\n\n" +
      "Los perfiles eSIM solo se pueden instalar **UNA VEZ**. Si eliminas el eSIM de tu dispositivo, **no se puede recuperar**.\n\n" +
      "Si eliminaste accidentalmente tu eSIM:\n" +
      "• Lamentablemente, no se puede restaurar\n" +
      "• Necesitarás comprar un nuevo plan\n" +
      "• Contacta a nuestro equipo — podemos ofrecer un descuento en reemplazo\n\n" +
      "💡 **Consejo**: Si no estás viajando, simplemente **desactiva** el eSIM en los ajustes en lugar de eliminarlo.",
  },
  {
    keywords: ['multi country', 'regional', 'global plan', 'multiple countries', 'many countries', 'travel to several', 'europe plan', 'asia plan', 'world plan'],
    keywords_zh: ['多国', '地区套餐', '全球套餐', '多个国家', '欧洲套餐', '亚洲套餐', '跨国'],
    keywords_es: ['multi país', 'regional', 'plan global', 'múltiples países', 'plan europa', 'plan asia', 'plan mundial'],
    response:
      "Yes! We offer multi-country plans for travelers visiting several destinations:\n\n" +
      "🌍 **Regional plans**: Cover groups of countries in one region (e.g., Europe, Southeast Asia, Middle East)\n" +
      "🌐 **Global plans**: Cover 50+ countries worldwide with a single SIM\n\n" +
      "**How it works**:\n" +
      "• Buy one plan, use data across all covered countries\n" +
      "• No need to switch SIMs between countries\n" +
      "• Seamless handover as you cross borders\n\n" +
      "Browse multi-country plans in the Shop tab by selecting \"1 SIM = Many Countries\".",
    response_zh:
      "是的！我们为访问多个目的地的旅行者提供多国套餐：\n\n" +
      "🌍 **地区套餐**：覆盖同一地区的多个国家（如欧洲、东南亚、中东）\n" +
      "🌐 **全球套餐**：一张 SIM 卡覆盖 50+ 个国家\n\n" +
      "**使用方式**：\n" +
      "• 购买一个套餐，在所有覆盖国家使用数据\n" +
      "• 无需在国家之间更换 SIM 卡\n" +
      "• 跨越国境时无缝切换\n\n" +
      "在商店标签页选择'1 SIM = Many Countries'浏览多国套餐。",
    response_es:
      "¡Sí! Ofrecemos planes multi-país para viajeros:\n\n" +
      "🌍 **Planes regionales**: Cubren grupos de países (ej: Europa, Sudeste Asiático)\n" +
      "🌐 **Planes globales**: Cubren más de 50 países con una sola SIM\n\n" +
      "• Compra un plan, usa datos en todos los países cubiertos\n" +
      "• Sin cambiar SIM entre países\n\n" +
      "Explora planes multi-país en la Tienda seleccionando \"1 SIM = Many Countries\".",
  },
  {
    keywords: ['bind', 'binding', 'link', 'connect sim', 'register sim', 'pair', 'set up sim', 'setup sim'],
    keywords_zh: ['绑定', '注册卡', '关联', '配对', '设置卡', '绑卡'],
    keywords_es: ['vincular', 'registrar sim', 'conectar sim', 'emparejar', 'configurar sim'],
    response:
      "To bind/link your SIM card to your Evair account:\n\n" +
      "1️⃣ **Sign in** to the Evair app (create an account if you don't have one)\n" +
      "2️⃣ Go to the **SIM Card** tab at the top\n" +
      "3️⃣ Tap **\"Set Up Now\"** in the activation section\n" +
      "4️⃣ **Scan** the barcode on your SIM card, or **enter the ICCID** manually\n" +
      "5️⃣ Confirm the details and tap **\"Bind SIM Card\"**\n\n" +
      "Once bound, your SIM appears in My SIMs where you can check data usage, top up, and manage your plan.\n\n" +
      "⚠️ You must be logged in to bind a SIM card to your account.",
    response_zh:
      "将 SIM 卡绑定到您的 Evair 账户：\n\n" +
      "1️⃣ **登录** Evair 应用（没有账户请先注册）\n" +
      "2️⃣ 前往顶部的 **SIM 卡**标签\n" +
      "3️⃣ 点击激活区域的 **'立即设置'**\n" +
      "4️⃣ **扫描** SIM 卡上的条形码，或**手动输入 ICCID**\n" +
      "5️⃣ 确认信息后点击 **'绑定 SIM 卡'**\n\n" +
      "绑定后，您的 SIM 卡会出现在'我的 SIM 卡'中，可以查看流量、充值和管理套餐。\n\n" +
      "⚠️ 绑定 SIM 卡前必须先登录账户。",
    response_es:
      "Para vincular tu tarjeta SIM a tu cuenta Evair:\n\n" +
      "1️⃣ **Inicia sesión** en la app (crea una cuenta si no tienes)\n" +
      "2️⃣ Ve a la pestaña **SIM Card**\n" +
      "3️⃣ Toca **\"Configurar ahora\"**\n" +
      "4️⃣ **Escanea** el código de barras o **ingresa el ICCID** manualmente\n" +
      "5️⃣ Confirma y toca **\"Vincular SIM\"**\n\n" +
      "Una vez vinculada, tu SIM aparece en Mis SIMs para gestionar datos y recargar.\n\n" +
      "⚠️ Debes iniciar sesión para vincular una SIM.",
  },
  {
    keywords: ['no data', 'data not working', 'connected but no internet', 'connected no data', 'apn', 'apn settings', 'access point'],
    keywords_zh: ['没有数据', '连上了但没网', '无法上网', 'APN', '接入点', '有信号没网'],
    keywords_es: ['sin datos', 'conectado sin internet', 'apn', 'punto de acceso', 'no hay internet'],
    response:
      "If you're connected to a network but have no internet access, try these steps:\n\n" +
      "1️⃣ **Check Data Roaming**: Make sure it's turned ON\n" +
      "   • iOS: Settings > Cellular > Cellular Data Options > Data Roaming\n" +
      "   • Android: Settings > Network > Mobile Data > Roaming\n\n" +
      "2️⃣ **Check APN settings**: Some networks require manual APN configuration\n" +
      "   • iOS: Settings > Cellular > Cellular Data Network\n" +
      "   • Android: Settings > Network > Access Point Names\n" +
      "   • Try setting APN to: **internet** or **globaldata**\n\n" +
      "3️⃣ **Select EvairSIM as data line**: If you have dual SIM, go to Settings > Cellular > Cellular Data and select your EvairSIM line\n\n" +
      "4️⃣ **Toggle Airplane Mode** on and off\n\n" +
      "5️⃣ **Restart your device**\n\n" +
      "If none of these work, tell me your device model and country and I'll help further!",
    response_zh:
      "如果已连接到网络但无法上网，请尝试以下步骤：\n\n" +
      "1️⃣ **检查数据漫游**：确保已打开\n" +
      "   • iOS：设置 > 蜂窝网络 > 蜂窝数据选项 > 数据漫游\n" +
      "   • 安卓：设置 > 网络 > 移动数据 > 漫游\n\n" +
      "2️⃣ **检查 APN 设置**：部分网络需要手动配置 APN\n" +
      "   • 尝试将 APN 设置为：**internet** 或 **globaldata**\n\n" +
      "3️⃣ **选择 EvairSIM 为数据线路**：双卡手机请在设置中选择 EvairSIM 作为蜂窝数据\n\n" +
      "4️⃣ **开关飞行模式**\n\n" +
      "5️⃣ **重启设备**\n\n" +
      "如果以上都无效，请告诉我您的手机型号和所在国家！",
    response_es:
      "Si estás conectado pero sin internet:\n\n" +
      "1️⃣ **Verifica Roaming de datos**: Que esté activado\n" +
      "2️⃣ **Revisa APN**: Intenta configurar APN como: **internet** o **globaldata**\n" +
      "3️⃣ **Selecciona EvairSIM como línea de datos** (si tienes dual SIM)\n" +
      "4️⃣ **Activa/desactiva modo avión**\n" +
      "5️⃣ **Reinicia tu dispositivo**\n\n" +
      "Si nada funciona, dime tu modelo de dispositivo y país.",
  },
  {
    keywords: ['call', 'calls', 'phone call', 'voice', 'sms', 'text message', 'can i call', 'phone number', 'make calls'],
    keywords_zh: ['打电话', '通话', '语音', '短信', '电话号码', '能打电话吗', '拨号'],
    keywords_es: ['llamar', 'llamada', 'voz', 'sms', 'mensaje de texto', 'número de teléfono', 'puedo llamar'],
    response:
      "EvairSIM is a **data-only** service — it does not include voice calls or SMS by default.\n\n" +
      "However, you can still make calls using apps over data:\n\n" +
      "📞 **Voice calls**: Use WhatsApp, FaceTime, Skype, or any VoIP app\n" +
      "💬 **Messaging**: Use WhatsApp, iMessage (over data), Telegram, WeChat, etc.\n\n" +
      "💡 **Tip**: Keep your home SIM installed alongside EvairSIM (dual SIM) to receive SMS verification codes while abroad.\n\n" +
      "Your home phone number stays active for receiving calls/texts, while EvairSIM handles all your data needs.",
    response_zh:
      "EvairSIM 是**纯数据**服务 — 默认不包含语音通话或短信。\n\n" +
      "但您可以使用数据应用进行通话：\n\n" +
      "📞 **语音通话**：使用 WhatsApp、FaceTime、Skype 或任何 VoIP 应用\n" +
      "💬 **消息**：使用 WhatsApp、iMessage（通过数据）、Telegram、微信等\n\n" +
      "💡 **提示**：保留您的本国 SIM 卡（双卡）以在国外接收短信验证码。\n\n" +
      "本国号码继续接收电话/短信，EvairSIM 负责所有数据需求。",
    response_es:
      "EvairSIM es un servicio **solo de datos** — no incluye llamadas de voz ni SMS.\n\n" +
      "Sin embargo, puedes llamar usando apps:\n\n" +
      "📞 **Llamadas**: WhatsApp, FaceTime, Skype o cualquier app VoIP\n" +
      "💬 **Mensajes**: WhatsApp, iMessage, Telegram, WeChat, etc.\n\n" +
      "💡 **Consejo**: Mantén tu SIM local para recibir SMS de verificación mientras viajas.",
  },
];

const GREETING_PATTERNS = /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|yo|greetings|hola|你好|您好|嗨)\b/i;
const THANKS_PATTERNS = /^(thanks|thank you|thx|ty|appreciate|cheers|gracias|谢谢|感谢|多谢)\b/i;

const GREETING_RESPONSES: Record<DetectedLang, string> = {
  en: "Hello! 👋 I'm Evair's AI assistant. I can help you with:\n\n" +
    "• 📱 eSIM & Physical SIM activation\n" +
    "• 💳 Evair eCard setup\n" +
    "• 📊 Data plans, top-ups & pricing\n" +
    "• 🌍 Coverage in 190+ countries\n" +
    "• 🔧 Troubleshooting connectivity issues\n" +
    "• 💰 Billing, refunds & payments\n" +
    "• 📦 Shipping & delivery\n\n" +
    "What would you like to know?",
  zh: "您好！👋 我是 Evair 的 AI 助手。我可以帮助您：\n\n" +
    "• 📱 eSIM 和实体 SIM 卡激活\n" +
    "• 💳 Evair eCard 设置\n" +
    "• 📊 流量套餐、充值和价格\n" +
    "• 🌍 190+ 国家覆盖\n" +
    "• 🔧 网络连接故障排查\n" +
    "• 💰 账单、退款和付款\n" +
    "• 📦 配送和物流\n\n" +
    "请问有什么可以帮您？",
  es: "¡Hola! 👋 Soy el asistente de IA de Evair. Puedo ayudarte con:\n\n" +
    "• 📱 Activación de eSIM y SIM física\n" +
    "• 💳 Configuración de Evair eCard\n" +
    "• 📊 Planes de datos y recargas\n" +
    "• 🌍 Cobertura en más de 190 países\n" +
    "• 🔧 Solución de problemas\n" +
    "• 💰 Facturación y pagos\n\n" +
    "¿En qué te puedo ayudar?",
};

const THANKS_RESPONSES: Record<DetectedLang, string> = {
  en: "You're welcome! 😊 Is there anything else I can help you with regarding your EvairSIM?",
  zh: "不客气！😊 关于 EvairSIM 还有其他需要帮助的吗？",
  es: "¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte con tu EvairSIM?",
};

const FALLBACK_RESPONSES: Record<DetectedLang, string> = {
  en:
    "Thanks for your question! I want to make sure I give you the best answer. Here are some topics I can help with:\n\n" +
    "• 📱 eSIM/SIM activation & setup\n" +
    "• 💳 Evair eCard — setup, specs & troubleshooting\n" +
    "• 📊 Data plans & top-ups\n" +
    "• 🌍 Coverage & network info\n" +
    "• 🔧 Troubleshooting\n" +
    "• 💰 Billing & payments\n" +
    "• 📦 Shipping (Physical SIM)\n" +
    "• 👤 Account management\n\n" +
    "Could you rephrase your question or pick a topic? If you'd prefer, I can connect you with a live agent.",
  zh:
    "感谢您的提问！为了给您最好的解答，以下是我可以帮助的主题：\n\n" +
    "• 📱 eSIM/SIM 激活与设置\n" +
    "• 💳 Evair eCard — 设置、规格与故障排查\n" +
    "• 📊 流量套餐与充值\n" +
    "• 🌍 覆盖范围与网络信息\n" +
    "• 🔧 故障排查\n" +
    "• 💰 账单与付款\n" +
    "• 📦 配送（实体 SIM 卡）\n" +
    "• 👤 账户管理\n\n" +
    "请重新描述您的问题或选择一个主题。如果您需要，我可以为您转接人工客服。",
  es:
    "¡Gracias por tu pregunta! Estos son los temas en los que puedo ayudarte:\n\n" +
    "• 📱 Activación y configuración de eSIM/SIM\n" +
    "• 💳 Evair eCard\n" +
    "• 📊 Planes de datos y recargas\n" +
    "• 🌍 Cobertura y red\n" +
    "• 🔧 Solución de problemas\n" +
    "• 💰 Facturación y pagos\n" +
    "• 📦 Envío (SIM física)\n" +
    "• 👤 Gestión de cuenta\n\n" +
    "¿Podrías reformular tu pregunta? Si prefieres, puedo conectarte con un agente.",
};

const SHORT_INPUT_RESPONSES: Record<DetectedLang, string> = {
  en: "Could you provide a bit more detail? I'm here to help with anything related to your EvairSIM — activation, data plans, troubleshooting, billing, and more!",
  zh: "能否提供更多细节？我可以帮助您处理 EvairSIM 的任何问题 — 激活、流量套餐、故障排查、账单等！",
  es: "¿Podrías dar más detalles? Estoy aquí para ayudarte con todo lo relacionado con tu EvairSIM.",
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u4e00-\u9fff\u3400-\u4dbf\u00c0-\u024f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(normalized: string, keywords: string[]): number {
  let score = 0;
  const words = normalized.split(/\s+/);
  for (const kw of keywords) {
    const kwNorm = kw.toLowerCase();
    if (normalized.includes(kwNorm)) {
      const isChinese = /[\u4e00-\u9fff]/.test(kwNorm);
      if (isChinese) {
        score += 3;
        if (kwNorm.length >= 3) score += 2;
      } else {
        const escaped = kwNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const exactWord = new RegExp(`\\b${escaped}\\b`);
        score += exactWord.test(normalized) ? 3 : 1;
        if (kwNorm.split(' ').length > 1) score += 2;
      }
    } else {
      for (const w of words) {
        if (w.length >= 4 && kwNorm.length >= 4 && (w.startsWith(kwNorm.slice(0, 4)) || kwNorm.startsWith(w.slice(0, 4)))) {
          score += 1;
          break;
        }
      }
    }
  }
  return score;
}

export interface AIResponse {
  text: string;
  english: string;
  lang: DetectedLang;
}

export function getAIResponse(userMessage: string): string {
  return getMultilingualResponse(userMessage).text;
}

export interface AgentSuggestion {
  text: string;
  category: 'greeting' | 'ask_info' | 'resolve' | 'escalate' | 'refund' | 'technical';
}

export function getAgentSuggestions(customerMessages: string[]): AgentSuggestion[] {
  const lastMsg = customerMessages[customerMessages.length - 1] || '';
  const allText = customerMessages.join(' ');
  const normalized = normalizeText(allText);
  const suggestions: AgentSuggestion[] = [];

  const hasOrderInfo = /\b(ord|order|ORD)[- ]?\d+/i.test(allText) || /订单号/.test(allText);
  const hasIccid = /\b\d{19,20}\b/.test(allText);

  if (/refund|退款|退钱|reembolso|money back/i.test(normalized)) {
    if (hasOrderInfo) {
      suggestions.push({ text: "I've located your order. Let me check the refund eligibility now — please give me a moment.", category: 'resolve' });
      suggestions.push({ text: "Your eSIM hasn't been activated yet, so you're eligible for a full refund. I'm processing it now — you'll see it back on your card within 3-5 business days.", category: 'refund' });
      suggestions.push({ text: "I see that your eSIM has already been activated and data was used, so unfortunately it's not eligible for a full refund. However, I can offer you a credit toward your next purchase. Would that work for you?", category: 'refund' });
    } else {
      suggestions.push({ text: "I'd be happy to help with your refund request. Could you please share your order number or the email address you used to purchase?", category: 'ask_info' });
      suggestions.push({ text: "Sure, I can look into a refund for you. Could you provide your order number and the reason for the refund?", category: 'ask_info' });
    }
    suggestions.push({ text: "Your refund has been processed! You should see it reflected on your original payment method within 3-5 business days. Is there anything else I can help with?", category: 'refund' });
  }

  if (/activ|激活|开卡|开通|bind|绑定|setup|设置/i.test(normalized)) {
    if (!hasIccid) {
      suggestions.push({ text: "Could you share the ICCID number printed on your SIM card? It's a 19-20 digit number below the barcode.", category: 'ask_info' });
    }
    suggestions.push({ text: "I've checked your SIM and it's activated and ready to use. Please insert the card, make sure Data Roaming is turned on, and restart your device.", category: 'resolve' });
    suggestions.push({ text: "It looks like there's an issue with the activation. Let me escalate this to our technical team — they'll resolve it within 24 hours.", category: 'escalate' });
  }

  if (/not working|no signal|no internet|没网|没信号|不能用|no funciona|sin señal/i.test(normalized)) {
    suggestions.push({ text: "I'm sorry to hear that. Let's try a few things:\n1. Toggle Airplane Mode on/off\n2. Make sure Data Roaming is turned ON\n3. Restart your device\n\nPlease let me know if any of these help!", category: 'technical' });
    suggestions.push({ text: "Could you tell me your device model and which country you're currently in? This will help me troubleshoot faster.", category: 'ask_info' });
    suggestions.push({ text: "I've checked the network status on our end and everything looks normal. Try manually selecting a carrier: Settings > Carrier > turn off Automatic, then pick one of the available networks.", category: 'technical' });
    suggestions.push({ text: "I'm escalating this to our network operations team for a deeper investigation. We'll get back to you within a few hours.", category: 'escalate' });
  }

  if (/top.?up|recharge|充值|续费|加流量|more data|datos|recargar/i.test(normalized)) {
    suggestions.push({ text: "You can top up directly in the app — go to My SIMs, tap your active SIM, then tap \"Add Data\" to browse available packages.", category: 'resolve' });
    suggestions.push({ text: "I can see your current plan. What size data package were you looking for? We have options from 1GB to 10GB+.", category: 'ask_info' });
    suggestions.push({ text: "Your current plan is non-reloadable, which means top-ups aren't available for this specific plan. You would need to purchase a new plan once your data runs out. Would you like me to suggest some options?", category: 'resolve' });
  }

  if (/charge|payment|bill|账单|付款|扣费|cobro|pago|double/i.test(normalized)) {
    suggestions.push({ text: "I can see the charge on your account. Could you confirm the exact date and amount of the transaction you're concerned about?", category: 'ask_info' });
    suggestions.push({ text: "I've verified the charge — it appears to be a pending authorization that should auto-release within 3-7 days. If it doesn't drop off by then, please let us know and we'll investigate further.", category: 'resolve' });
    suggestions.push({ text: "I can confirm this was a duplicate charge. I've initiated a refund — you'll see it back on your card within 3-5 business days. Sorry for the inconvenience!", category: 'refund' });
  }

  if (/ship|deliver|快递|发货|配送|tracking|物流|envío/i.test(normalized)) {
    suggestions.push({ text: "Could you share your order number? I'll look up the tracking information for you right away.", category: 'ask_info' });
    suggestions.push({ text: "I've found your order! Here's your tracking number: [TRACKING]. You can track it at [URL]. Estimated delivery is within 3-5 business days.", category: 'resolve' });
    suggestions.push({ text: "I see your order hasn't shipped yet. I'm contacting our warehouse team to expedite this. You should receive a shipping notification within 24 hours.", category: 'escalate' });
  }

  if (/install|安装|qr|二维码|scan|扫描|delete|删除|recover|恢复/i.test(normalized)) {
    suggestions.push({ text: "Important reminder: eSIM profiles can only be installed once. If you've already deleted it from your device, unfortunately it cannot be recovered and you would need to purchase a new one.", category: 'technical' });
    suggestions.push({ text: "To install your eSIM, open the app, go to My eSIMs, tap your card, then tap \"Install\". You'll see a QR code — scan it from Settings > Cellular > Add eSIM on your phone.", category: 'resolve' });
    suggestions.push({ text: "I understand you accidentally deleted your eSIM. Since profiles can only be installed once, I'll need to issue you a replacement. Let me process that for you now.", category: 'refund' });
  }

  if (/human|agent|real person|人工|客服|真人|转接|humano|agente/i.test(normalized)) {
    suggestions.push({ text: "Hi! I'm a live agent and I'm here to help. Could you describe your issue in detail so I can assist you?", category: 'greeting' });
  }

  if (suggestions.length === 0) {
    suggestions.push(
      { text: "Hi! I'm looking into your issue now. Could you provide a bit more detail so I can help you faster?", category: 'greeting' },
      { text: "Could you share your order number or ICCID so I can look up your account?", category: 'ask_info' },
      { text: "I've resolved the issue on our end. Please restart your device and let me know if it's working now.", category: 'resolve' },
      { text: "I'm escalating this to our specialist team. They'll follow up with you within 24 hours.", category: 'escalate' },
    );
  }

  suggestions.push({ text: "Is there anything else I can help you with? Have a great day! 😊", category: 'resolve' });

  return suggestions;
}

export function getMultilingualResponse(userMessage: string): AIResponse {
  const trimmed = userMessage.trim();
  const lang = detectLanguage(trimmed);

  if (GREETING_PATTERNS.test(trimmed)) {
    return { text: GREETING_RESPONSES[lang], english: GREETING_RESPONSES.en, lang };
  }

  if (THANKS_PATTERNS.test(trimmed)) {
    return { text: THANKS_RESPONSES[lang], english: THANKS_RESPONSES.en, lang };
  }

  const normalized = normalizeText(trimmed);

  if (normalized.length < 2) {
    return { text: SHORT_INPUT_RESPONSES[lang], english: SHORT_INPUT_RESPONSES.en, lang };
  }

  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    const allKeywords = [
      ...entry.keywords,
      ...(entry.keywords_zh || []),
      ...(entry.keywords_es || []),
    ];
    const score = scoreMatch(normalized, allKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore >= 2) {
    const respKey = lang === 'zh' ? 'response_zh' : lang === 'es' ? 'response_es' : 'response';
    const fuKey = lang === 'zh' ? 'followUp_zh' : lang === 'es' ? 'followUp_es' : 'followUp';
    let response = (bestMatch[respKey] || bestMatch.response);
    const followUp = bestMatch[fuKey] || bestMatch.followUp;
    if (followUp) response += `\n\n${followUp}`;
    return { text: response, english: bestMatch.response, lang };
  }

  return { text: FALLBACK_RESPONSES[lang], english: FALLBACK_RESPONSES.en, lang };
}

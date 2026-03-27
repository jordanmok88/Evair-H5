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
      "📱 **eSIM**: After purchase, go to Settings > Cellular > Add eSIM, then scan the QR code we provided via email.\n\n" +
      "💳 **Physical SIM**: Insert the card into your device, then open the Evair app and enter your ICCID number to bind and activate it.\n\n" +
      "Activation is usually instant for eSIMs and takes up to 5 minutes for physical SIMs.",
    response_zh:
      "激活您的 EvairSIM：\n\n" +
      "📱 **eSIM**：购买后，前往 设置 > 蜂窝网络 > 添加 eSIM，然后扫描我们通过邮件发送的二维码。\n\n" +
      "💳 **实体 SIM 卡**：将卡插入手机，然后打开 Evair 应用，输入 ICCID 号码进行绑定激活。\n\n" +
      "eSIM 通常即时激活，实体 SIM 卡最多需要 5 分钟。",
    response_es:
      "Para activar tu EvairSIM:\n\n" +
      "📱 **eSIM**: Después de la compra, ve a Ajustes > Datos móviles > Añadir eSIM y escanea el código QR que te enviamos por email.\n\n" +
      "💳 **SIM física**: Inserta la tarjeta en tu dispositivo, luego abre la app Evair e ingresa tu número ICCID para vincular y activar.\n\n" +
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
      "💡 Make sure you're connected to WiFi during installation.",
    response_zh:
      "安装您的 eSIM：\n\n" +
      "**iPhone (iOS 12.1+)：**\n" +
      "1. 前往 设置 > 蜂窝网络 > 添加蜂窝号码方案\n" +
      "2. 扫描确认邮件中的二维码\n" +
      "3. 为其命名（如"旅行"）\n" +
      "4. 在蜂窝数据选项中打开数据漫游\n\n" +
      "**安卓：**\n" +
      "1. 前往 设置 > 网络和互联网 > SIM 卡\n" +
      "2. 点击"添加 eSIM"或"下载 SIM"\n" +
      "3. 扫描二维码\n\n" +
      "💡 安装过程中请确保连接 WiFi。",
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
      "💡 Asegúrate de estar conectado a WiFi durante la instalación.",
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
      "Physical SIM cards work with any unlocked device that accepts nano-SIM.",
    response_zh:
      "EvairSIM eSIM 兼容大多数现代智能手机：\n\n" +
      "✅ **iPhone**：XS、XR、11、12、13、14、15、16 及更新机型\n" +
      "✅ **三星**：Galaxy S20+ 及更新、Galaxy Z 系列\n" +
      "✅ **Google Pixel**：Pixel 3a 及更新\n" +
      "✅ **iPad**：Pro（第3代+）、Air（第3代+）、Mini（第5代+）\n\n" +
      "⚠️ 您的设备必须是**无锁版**才能使用 EvairSIM。\n\n" +
      "实体 SIM 卡适用于任何支持 nano-SIM 的无锁设备。",
    response_es:
      "EvairSIM eSIM es compatible con la mayoría de smartphones modernos:\n\n" +
      "✅ **iPhone**: XS, XR, 11, 12, 13, 14, 15, 16 y posteriores\n" +
      "✅ **Samsung**: Galaxy S20+ y posteriores, serie Galaxy Z\n" +
      "✅ **Google Pixel**: Pixel 3a y posteriores\n\n" +
      "⚠️ Tu dispositivo debe estar **desbloqueado** para usar EvairSIM.\n\n" +
      "Las tarjetas SIM físicas funcionan con cualquier dispositivo desbloqueado que acepte nano-SIM.",
  },
  {
    keywords: ['data', 'top up', 'topup', 'recharge', 'more data', 'add data', 'ran out', 'gb', 'usage', 'how much data', 'data left', 'remaining'],
    keywords_zh: ['流量', '充值', '续费', '加流量', '用完了', '还剩多少', '剩余流量', '数据'],
    keywords_es: ['datos', 'recargar', 'más datos', 'agregar datos', 'se acabó', 'cuántos datos', 'datos restantes'],
    response:
      "You can check and manage your data in the Evair app:\n\n" +
      "📊 **Check remaining data**: Go to My eSIMs/SIMs tab — the ring gauge shows your usage.\n\n" +
      "➕ **Top up**: Tap \"Add Data\" on your active SIM to purchase additional data packages starting from $3.00 for 1GB.\n\n" +
      "Data packages are available in various sizes and can be added at any time, even before your current plan expires.",
    response_zh:
      "您可以在 Evair 应用中查看和管理流量：\n\n" +
      "📊 **查看剩余流量**：前往"我的 SIM 卡"标签页 — 环形图显示您的使用量。\n\n" +
      "➕ **充值**：点击已激活 SIM 卡上的"添加流量"，购买额外流量包，1GB 起价 $3.00。\n\n" +
      "流量包有多种规格，可以随时添加，即使当前套餐尚未到期。",
    response_es:
      "Puedes verificar y gestionar tus datos en la app Evair:\n\n" +
      "📊 **Ver datos restantes**: Ve a la pestaña Mis SIMs — el indicador circular muestra tu uso.\n\n" +
      "➕ **Recargar**: Toca \"Agregar datos\" en tu SIM activa para comprar paquetes adicionales desde $3.00 por 1GB.\n\n" +
      "Los paquetes de datos están disponibles en varios tamaños y se pueden agregar en cualquier momento.",
  },
  {
    keywords: ['price', 'pricing', 'cost', 'how much', 'plan', 'plans', 'cheap', 'expensive', 'discount', 'offer', 'promotion', '50%', 'first order'],
    keywords_zh: ['价格', '多少钱', '套餐', '便宜', '贵', '优惠', '折扣', '促销', '首单'],
    keywords_es: ['precio', 'cuánto cuesta', 'plan', 'planes', 'barato', 'caro', 'descuento', 'oferta', 'promoción'],
    response:
      "EvairSIM offers competitive pricing with coverage in 190+ countries:\n\n" +
      "🎉 **New customer?** Get 50% OFF your first order!\n\n" +
      "Sample plans (prices vary by country):\n" +
      "• 1 GB / 7 days — from $2.25\n" +
      "• 3 GB / 15 days — from $4.50\n" +
      "• 5 GB / 30 days — from $7.50\n" +
      "• 10 GB / 30 days — from $12.50\n\n" +
      "All plans include hotspot sharing and 5G where available.",
    response_zh:
      "EvairSIM 提供覆盖 190+ 国家的超值套餐：\n\n" +
      "🎉 **新用户？** 首单享受5折优惠！\n\n" +
      "参考套餐（价格因国家而异）：\n" +
      "• 1 GB / 7 天 — 低至 $2.25\n" +
      "• 3 GB / 15 天 — 低至 $4.50\n" +
      "• 5 GB / 30 天 — 低至 $7.50\n" +
      "• 10 GB / 30 天 — 低至 $12.50\n\n" +
      "所有套餐均支持热点共享和 5G（视运营商而定）。",
    response_es:
      "EvairSIM ofrece precios competitivos con cobertura en más de 190 países:\n\n" +
      "🎉 **¿Cliente nuevo?** ¡50% de descuento en tu primer pedido!\n\n" +
      "Planes de ejemplo (precios varían por país):\n" +
      "• 1 GB / 7 días — desde $2.25\n" +
      "• 3 GB / 15 días — desde $4.50\n" +
      "• 5 GB / 30 días — desde $7.50\n" +
      "• 10 GB / 30 días — desde $12.50\n\n" +
      "Todos los planes incluyen hotspot y 5G donde esté disponible.",
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
      "5️⃣ 确认套餐是否已过期（在"我的 SIM 卡"中查看）\n\n" +
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
    keywords: ['bill', 'billing', 'payment', 'pay', 'charge', 'charged', 'refund', 'receipt', 'invoice', 'credit card', 'transaction'],
    keywords_zh: ['账单', '付款', '支付', '扣费', '退款', '收据', '发票', '信用卡', '交易', '账单问题'],
    keywords_es: ['factura', 'pago', 'cobro', 'reembolso', 'recibo', 'tarjeta de crédito', 'transacción'],
    response:
      "Regarding billing and payments:\n\n" +
      "💳 **Payment methods**: We accept all major credit/debit cards and Apple Pay.\n\n" +
      "🧾 **Receipts**: Sent automatically to your email after purchase. You can also view orders in Profile > Orders.\n\n" +
      "🔄 **Refunds**: If your eSIM hasn't been activated, you're eligible for a full refund within 30 days. Contact us with your order details.\n\n" +
      "If you see an unexpected charge, please share the transaction date and amount so I can look into it.",
    response_zh:
      "关于账单和付款：\n\n" +
      "💳 **支付方式**：我们接受所有主流信用卡/借记卡和 Apple Pay。\n\n" +
      "🧾 **收据**：购买后自动发送到您的邮箱。您也可以在 个人中心 > 订单 中查看。\n\n" +
      "🔄 **退款**：如果您的 eSIM 尚未激活，可以在 30 天内申请全额退款。请提供您的订单详情。\n\n" +
      "如果您发现异常扣费，请告诉我交易日期和金额，我会为您查询。",
    response_es:
      "Sobre facturación y pagos:\n\n" +
      "💳 **Métodos de pago**: Aceptamos todas las tarjetas principales y Apple Pay.\n\n" +
      "🧾 **Recibos**: Se envían automáticamente a tu email después de la compra.\n\n" +
      "🔄 **Reembolsos**: Si tu eSIM no ha sido activada, puedes solicitar un reembolso completo dentro de 30 días.\n\n" +
      "Si ves un cargo inesperado, comparte la fecha y monto de la transacción.",
  },
  {
    keywords: ['ship', 'shipping', 'delivery', 'deliver', 'arrive', 'tracking', 'physical', 'mail', 'how long'],
    keywords_zh: ['快递', '发货', '配送', '到货', '物流', '追踪', '寄', '多久到', '运费'],
    keywords_es: ['envío', 'entrega', 'llegar', 'rastreo', 'correo', 'cuánto tarda'],
    response:
      "Physical SIM card shipping details:\n\n" +
      "📦 **Shipping fee**: $5.99 flat rate worldwide\n" +
      "🚀 **Processing time**: 1-2 business days\n" +
      "📬 **Delivery time**:\n" +
      "   • US/Canada: 3-5 business days\n" +
      "   • Europe: 5-7 business days\n" +
      "   • Rest of world: 7-14 business days\n\n" +
      "Tracking info is sent via email once your order ships.\n\n" +
      "💡 Need it faster? Consider our eSIM — it's delivered instantly!",
    response_zh:
      "实体 SIM 卡配送详情：\n\n" +
      "📦 **运费**：全球统一 $5.99\n" +
      "🚀 **处理时间**：1-2 个工作日\n" +
      "📬 **配送时间**：\n" +
      "   • 美国/加拿大：3-5 个工作日\n" +
      "   • 欧洲：5-7 个工作日\n" +
      "   • 其他地区：7-14 个工作日\n\n" +
      "发货后会通过邮件发送物流追踪信息。\n\n" +
      "💡 需要更快？试试我们的 eSIM — 即时交付！",
    response_es:
      "Detalles de envío de tarjeta SIM física:\n\n" +
      "📦 **Costo de envío**: $5.99 tarifa fija mundial\n" +
      "🚀 **Tiempo de procesamiento**: 1-2 días hábiles\n" +
      "📬 **Tiempo de entrega**:\n" +
      "   • EE.UU./Canadá: 3-5 días hábiles\n" +
      "   • Europa: 5-7 días hábiles\n" +
      "   • Resto del mundo: 7-14 días hábiles\n\n" +
      "💡 ¿Lo necesitas más rápido? Prueba nuestro eSIM — ¡entrega instantánea!",
  },
  {
    keywords: ['expire', 'expiry', 'expiration', 'validity', 'valid', 'how long last', 'duration', 'renew', 'extend'],
    keywords_zh: ['过期', '有效期', '到期', '多长时间', '续期', '延长', '有效'],
    keywords_es: ['expirar', 'vencimiento', 'validez', 'cuánto dura', 'duración', 'renovar', 'extender'],
    response:
      "Your data plan validity starts when you first connect to a network in your destination country, not when you purchase it.\n\n" +
      "⏱️ **Plan duration**: Ranges from 7 to 30 days depending on your plan.\n\n" +
      "📅 **Check expiry**: Open My SIMs tab — the expiry date is shown on your SIM card details.\n\n" +
      "You can purchase a new plan or top up before your current one expires to keep your connection active.",
    response_zh:
      "您的流量套餐有效期从到达目的地国家首次连接网络时开始计算，而非购买时。\n\n" +
      "⏱️ **套餐时长**：根据套餐不同，从 7 天到 30 天不等。\n\n" +
      "📅 **查看到期时间**：打开"我的 SIM 卡"标签页，到期日期会显示在卡片详情中。\n\n" +
      "您可以在当前套餐到期前购买新套餐或充值，以保持网络连接。",
    response_es:
      "La validez de tu plan comienza cuando te conectas por primera vez en tu país de destino, no cuando lo compras.\n\n" +
      "⏱️ **Duración**: De 7 a 30 días según el plan.\n\n" +
      "📅 **Ver vencimiento**: Abre la pestaña Mis SIMs.\n\n" +
      "Puedes comprar un nuevo plan o recargar antes de que expire para mantener tu conexión.",
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
      "🔑 **忘记密码**：在登录页面点击"忘记密码"，我们会发送重置链接。\n" +
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
      "所有 SIM 卡都在"我的 SIM 卡"标签页中管理，可轻松切换。",
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
    keywords: ['ecard', 'e-card', 'evair ecard', 'what is ecard', 'physical esim', 'esim card', 'esim chip'],
    keywords_zh: ['eCard', '实体eSIM', 'eSIM卡', '芯片卡'],
    response:
      "**Evair eCard** is a physical SIM card with an embedded eSIM chip — it brings eSIM technology to any phone, even those without built-in eSIM support.\n\n" +
      "🔹 Simply insert the eCard like a regular SIM card\n" +
      "🔹 Download up to **15–20 eSIM profiles** onto a single card (1.5MB capacity)\n" +
      "🔹 Switch between profiles anytime — travel data, local plans, and more\n" +
      "🔹 Works on both **Android** and **iPhone**\n\n" +
      "It's GSMA certified, follows the **SGP.22 V2.5** RSP standard, and supports **5G** networks with MEP compatibility.",
    response_zh:
      "**Evair eCard** 是一张内置 eSIM 芯片的实体 SIM 卡 — 让任何手机都能使用 eSIM 技术，即使手机本身不支持 eSIM。\n\n" +
      "🔹 像普通 SIM 卡一样插入即可\n" +
      "🔹 一张卡可下载 **15-20 个 eSIM 配置文件**（1.5MB 容量）\n" +
      "🔹 随时切换配置文件 — 旅行数据、本地套餐等\n" +
      "🔹 **安卓**和 **iPhone** 都支持\n\n" +
      "GSMA 认证，遵循 **SGP.22 V2.5** RSP 标准，支持 **5G** 网络。",
    followUp: "Would you like to know how to set up an eCard, or how it works on iPhone vs Android?",
    followUp_zh: "想了解如何设置 eCard，或者在 iPhone 和安卓上的使用方法吗？",
  },
];

const GREETING_PATTERNS = /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|yo|greetings|hola|你好|您好|嗨)\b/i;
const THANKS_PATTERNS = /^(thanks|thank you|thx|ty|appreciate|cheers|gracias|谢谢|感谢|多谢)\b/i;

const GREETING_RESPONSES: Record<DetectedLang, string> = {
  en: "Hello! 👋 I'm Evair's AI assistant. I can help you with SIM activation, eSIM setup, Evair eCard, data plans, troubleshooting, billing, and more. What would you like to know?",
  zh: "您好！👋 我是 Evair 的 AI 助手。我可以帮助您处理 SIM 激活、eSIM 设置、eCard、流量套餐、故障排查、账单等问题。请问有什么可以帮您？",
  es: "¡Hola! 👋 Soy el asistente de IA de Evair. Puedo ayudarte con activación de SIM, configuración de eSIM, planes de datos, facturación y más. ¿En qué te puedo ayudar?",
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
  for (const kw of keywords) {
    const kwNorm = kw.toLowerCase();
    if (normalized.includes(kwNorm)) {
      const exactWord = new RegExp(`\\b${kwNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      score += exactWord.test(normalized) ? 3 : 1;
      if (kwNorm.split(' ').length > 1) score += 2;
      if (/[\u4e00-\u9fff]/.test(kwNorm)) score += 2;
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

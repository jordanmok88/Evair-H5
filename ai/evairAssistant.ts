/**
 * Evair customer-support AI assistant.
 *
 * Deliberate editorial choices (updated 2026-04):
 *   • No emojis or decorative icons. Every reply is plain text so the chat
 *     surface reads as a message from a professional support agent, not a
 *     marketing push.
 *   • Warm, welcoming, unambiguously polite tone across English, 简体中文
 *     and Español. "Please", "thank you", "I would be happy to help" are
 *     the defaults. No exclamation-heavy copy, no slang.
 *   • Concrete next step in every reply: either an action the customer can
 *     take themselves, or the specific piece of information we need from
 *     them to move forward.
 *   • Supplier-aware vocabulary. eSIMs (travel) and physical US SIMs (Amazon
 *     retail) have
 *     different setup and tracking journeys — the knowledge base reflects
 *     that so customers get accurate instructions for what they actually
 *     bought.
 *
 * Matching stays keyword-based for predictability. Upstream callers only
 * use `getMultilingualResponse`; the other exports remain for future
 * human-agent assist surfaces.
 */

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
      "I would be happy to help you activate your EvairSIM.\n\n" +
      "**eSIM**\nOpen the Evair app, go to **My eSIMs**, tap your card, then tap **Install** to see the QR code and step-by-step instructions. Activation is typically immediate.\n\n" +
      "**Physical SIM (United States only)**\nInsert the card, open the app, go to **SIM Card > Set Up Now**, and scan or enter the ICCID printed on the card to bind it to your account. Activation normally completes within a few minutes.\n\n" +
      "**Important**: An eSIM profile can only be installed once. Please do not delete it from your device after installation, as it cannot be restored.",
    response_zh:
      "很高兴为您协助激活 EvairSIM。\n\n" +
      "**eSIM**\n请打开 Evair 应用，进入 **我的 eSIM**，点击您的卡片，然后点击 **安装**，即可看到二维码以及详细步骤。eSIM 通常可立即激活。\n\n" +
      "**实体 SIM 卡（仅限美国）**\n请插入卡片，打开应用，进入 **SIM 卡 > 立即设置**，扫描或输入卡片上的 ICCID 以完成绑定。通常几分钟内完成激活。\n\n" +
      "**温馨提示**：eSIM 配置文件只能安装一次，安装后请勿从设备中删除，删除后将无法恢复。",
    response_es:
      "Con mucho gusto le ayudo a activar su EvairSIM.\n\n" +
      "**eSIM**\nAbra la aplicación Evair, vaya a **Mis eSIMs**, seleccione su tarjeta y pulse **Instalar** para ver el código QR y las instrucciones. La activación suele ser inmediata.\n\n" +
      "**SIM física (solo Estados Unidos)**\nInserte la tarjeta, abra la aplicación, vaya a **SIM Card > Configurar ahora** y escanee o introduzca el ICCID impreso en la tarjeta para vincularla a su cuenta. La activación suele completarse en pocos minutos.\n\n" +
      "**Importante**: el perfil eSIM solo puede instalarse una vez. Le rogamos no eliminarlo del dispositivo tras la instalación, ya que no puede restaurarse.",
    followUp: "Would you like instructions tailored to your specific device model?",
    followUp_zh: "需要我根据您的手机型号提供更具体的步骤吗？",
    followUp_es: "¿Le gustaría recibir instrucciones adaptadas a su modelo de dispositivo?",
  },
  {
    keywords: ['iccid', 'eid', 'number', 'where is iccid', 'find iccid', 'card number', 'serial', 'barcode'],
    keywords_zh: ['卡号', '序列号', '在哪找', 'ICCID在哪', '条形码'],
    keywords_es: ['número de tarjeta', 'número serial', 'dónde está', 'código de barras'],
    response:
      "The ICCID is a 19 to 20 digit identifier unique to your SIM card. You can locate it in any of the following places:\n\n" +
      "1. On the SIM card itself, printed below the barcode.\n" +
      "2. On the card holder, next to the punch-out area.\n" +
      "3. On your device, under **Settings > About Phone > SIM Status**.\n\n" +
      "For eSIMs, the EID is shown on iOS under **Settings > General > About**.",
    response_zh:
      "ICCID 是您 SIM 卡上的 19 至 20 位唯一识别码。您可以在以下位置找到：\n\n" +
      "1. SIM 卡本体，印在条形码下方。\n" +
      "2. 卡托上，位于卡片冲压孔旁。\n" +
      "3. 手机系统设置：**设置 > 关于手机 > SIM 卡状态**。\n\n" +
      "如为 eSIM，iOS 用户可在 **设置 > 通用 > 关于本机** 中查看 EID。",
    response_es:
      "El ICCID es un identificador único de 19 a 20 dígitos de su tarjeta SIM. Puede encontrarlo en los siguientes lugares:\n\n" +
      "1. En la propia tarjeta SIM, impreso debajo del código de barras.\n" +
      "2. En el soporte de la tarjeta, junto al área troquelada.\n" +
      "3. En su dispositivo, en **Ajustes > Acerca del teléfono > Estado de la SIM**.\n\n" +
      "Para eSIMs, el EID aparece en iOS en **Ajustes > General > Información**.",
  },
  {
    keywords: ['install esim', 'setup esim', 'qr code', 'scan', 'add esim', 'esim setup', 'how to install'],
    keywords_zh: ['安装', '设置eSIM', '二维码', '扫描', '添加eSIM', '怎么安装'],
    keywords_es: ['instalar esim', 'configurar esim', 'código qr', 'escanear', 'añadir esim', 'cómo instalar'],
    response:
      "Here is how to install your eSIM. Please make sure your device is connected to Wi-Fi before starting.\n\n" +
      "**iPhone (iOS 12.1 or later)**\n" +
      "1. Open **Settings > Cellular > Add Cellular Plan**.\n" +
      "2. Scan the QR code from your confirmation email or from the Evair app.\n" +
      "3. Assign a label for the line (for example, \"Travel\").\n" +
      "4. Enable **Data Roaming** under **Cellular Data Options**.\n\n" +
      "**Android**\n" +
      "1. Open **Settings > Network & Internet > SIMs**.\n" +
      "2. Tap **Add eSIM** or **Download SIM**.\n" +
      "3. Scan the QR code.\n\n" +
      "**Important**: an eSIM profile can only be installed once. If you delete the profile from your device later it cannot be recovered, and a replacement plan would need to be purchased.",
    response_zh:
      "以下是安装 eSIM 的步骤。安装过程中请保持设备连接 Wi-Fi。\n\n" +
      "**iPhone（iOS 12.1 或更高版本）**\n" +
      "1. 打开 **设置 > 蜂窝网络 > 添加蜂窝号码方案**。\n" +
      "2. 扫描确认邮件或 Evair 应用中的二维码。\n" +
      "3. 为该线路命名，例如 \"旅行\"。\n" +
      "4. 在 **蜂窝数据选项** 中开启 **数据漫游**。\n\n" +
      "**Android**\n" +
      "1. 打开 **设置 > 网络和互联网 > SIM 卡**。\n" +
      "2. 点击 **添加 eSIM** 或 **下载 SIM**。\n" +
      "3. 扫描二维码。\n\n" +
      "**温馨提示**：eSIM 配置文件仅可安装一次。若日后从设备中删除，将无法恢复，需要重新购买。",
    response_es:
      "A continuación encontrará los pasos para instalar su eSIM. Le recomendamos conectarse a Wi-Fi antes de comenzar.\n\n" +
      "**iPhone (iOS 12.1 o superior)**\n" +
      "1. Abra **Ajustes > Datos móviles > Añadir plan celular**.\n" +
      "2. Escanee el código QR del correo de confirmación o de la aplicación Evair.\n" +
      "3. Asigne un nombre a la línea (por ejemplo, \"Viaje\").\n" +
      "4. Active el **roaming de datos** en **Opciones de datos móviles**.\n\n" +
      "**Android**\n" +
      "1. Abra **Ajustes > Red e Internet > SIMs**.\n" +
      "2. Pulse **Añadir eSIM** o **Descargar SIM**.\n" +
      "3. Escanee el código QR.\n\n" +
      "**Importante**: un perfil eSIM solo puede instalarse una vez. Si se elimina del dispositivo posteriormente no podrá recuperarse y será necesario adquirir un nuevo plan.",
  },
  {
    keywords: ['compatible', 'compatibility', 'support', 'supported', 'work with', 'which phone', 'device', 'iphone', 'android', 'samsung', 'pixel', 'does my phone'],
    keywords_zh: ['兼容', '支持', '哪些手机', '适用', '能用吗', '我的手机'],
    keywords_es: ['compatible', 'compatibilidad', 'soporta', 'funciona con', 'qué teléfono', 'dispositivo'],
    response:
      "EvairSIM is compatible with most modern smartphones that support eSIM:\n\n" +
      "- **iPhone**: XS, XR, 11, 12, 13, 14, 15, 16 and newer.\n" +
      "- **Samsung**: Galaxy S20 series and newer, along with the Galaxy Z series.\n" +
      "- **Google Pixel**: Pixel 3a and newer.\n" +
      "- **iPad**: Pro (3rd generation and newer), Air (3rd generation and newer), Mini (5th generation and newer).\n\n" +
      "Two additional notes:\n\n" +
      "- Your device must be **carrier-unlocked** in order to use EvairSIM.\n" +
      "- Our physical SIM cards and the Evair eCard work with any unlocked device that accepts a nano-SIM, including phones that do not have built-in eSIM support.\n\n" +
      "If you would like me to confirm compatibility for a specific model, please let me know which device you are using.",
    response_zh:
      "EvairSIM 兼容绝大多数支持 eSIM 的现代智能手机：\n\n" +
      "- **iPhone**：XS、XR、11、12、13、14、15、16 及更新机型。\n" +
      "- **三星 Samsung**：Galaxy S20 系列及更新机型，以及 Galaxy Z 系列。\n" +
      "- **Google Pixel**：Pixel 3a 及更新机型。\n" +
      "- **iPad**：Pro（第 3 代及更新）、Air（第 3 代及更新）、Mini（第 5 代及更新）。\n\n" +
      "另外请留意两点：\n\n" +
      "- 您的设备必须为**无锁版**才能使用 EvairSIM。\n" +
      "- 我们的实体 SIM 卡与 Evair eCard 兼容任何支持 nano-SIM 的无锁设备，即便该设备本身不支持内置 eSIM。\n\n" +
      "如果您希望我确认具体机型是否兼容，请告诉我设备型号。",
    response_es:
      "EvairSIM es compatible con la mayoría de los smartphones modernos que admiten eSIM:\n\n" +
      "- **iPhone**: XS, XR, 11, 12, 13, 14, 15, 16 y posteriores.\n" +
      "- **Samsung**: Galaxy S20 y posteriores, y toda la serie Galaxy Z.\n" +
      "- **Google Pixel**: Pixel 3a y posteriores.\n" +
      "- **iPad**: Pro (3.ª generación y posteriores), Air (3.ª generación y posteriores), Mini (5.ª generación y posteriores).\n\n" +
      "Dos consideraciones importantes:\n\n" +
      "- Su dispositivo debe estar **liberado** para poder utilizar EvairSIM.\n" +
      "- Nuestras tarjetas SIM físicas y el Evair eCard funcionan con cualquier dispositivo liberado que acepte nano-SIM, incluso si no admite eSIM integrado.\n\n" +
      "Si lo desea, indíqueme el modelo de su dispositivo y confirmo la compatibilidad.",
  },
  {
    keywords: ['data', 'top up', 'topup', 'recharge', 'more data', 'add data', 'ran out', 'gb', 'usage', 'how much data', 'data left', 'remaining'],
    keywords_zh: ['流量', '充值', '续费', '加流量', '用完了', '还剩多少', '剩余流量', '数据'],
    keywords_es: ['datos', 'recargar', 'más datos', 'agregar datos', 'se acabó', 'cuántos datos', 'datos restantes'],
    response:
      "You can review and manage your data usage directly in the Evair app:\n\n" +
      "- **View remaining data**: open the **My eSIMs / SIMs** tab. The data indicator on each card shows current usage and remaining allowance.\n" +
      "- **Top up**: on an active SIM, tap **Add Data** to browse compatible packages and complete the purchase.\n\n" +
      "A note on plan types:\n\n" +
      "- **Reloadable plans** accept top-ups. You may add data before the current plan expires, and the new allowance stacks onto the existing balance.\n" +
      "- **Non-reloadable plans** carry a fixed allowance. Once it is exhausted, a new plan would need to be purchased.\n\n" +
      "Top-up options are typically available in sizes from 1 GB up to 10 GB and beyond, with durations of 7, 15 or 30 days. Pricing varies by destination.",
    response_zh:
      "您可以在 Evair 应用中直接查看并管理流量：\n\n" +
      "- **查看剩余流量**：进入 **我的 SIM 卡** 标签，每张卡片上的流量指示器会显示当前用量与剩余额度。\n" +
      "- **充值加量**：在已激活的 SIM 卡上点击 **添加流量**，即可查看可购买的套餐并完成支付。\n\n" +
      "关于套餐类型：\n\n" +
      "- **可充值套餐**支持随时追加流量。您可以在当前套餐到期前叠加新流量。\n" +
      "- **不可充值套餐**为固定流量套餐，用尽后需要重新购买新套餐。\n\n" +
      "充值包通常提供 1 GB 至 10 GB 以上的多种规格，时长包括 7、15 或 30 天。价格因目的地而异。",
    response_es:
      "Puede consultar y gestionar sus datos directamente en la aplicación Evair:\n\n" +
      "- **Consultar datos restantes**: abra la pestaña **Mis eSIMs / SIMs**. El indicador de datos de cada tarjeta muestra el uso actual y el saldo disponible.\n" +
      "- **Recargar**: en una SIM activa, pulse **Añadir datos** para ver los paquetes compatibles y completar la compra.\n\n" +
      "Sobre los tipos de plan:\n\n" +
      "- Los **planes recargables** permiten añadir datos antes de la expiración; la nueva cantidad se suma al saldo actual.\n" +
      "- Los **planes no recargables** tienen una cantidad fija. Una vez consumida, será necesario adquirir un nuevo plan.\n\n" +
      "Las recargas se ofrecen habitualmente en tamaños desde 1 GB hasta 10 GB o más, con duraciones de 7, 15 o 30 días. El precio varía según el destino.",
  },
  {
    keywords: ['price', 'pricing', 'cost', 'how much', 'plan', 'plans', 'cheap', 'expensive', 'discount', 'offer', 'promotion', '50%', 'first order'],
    keywords_zh: ['价格', '多少钱', '套餐', '便宜', '贵', '优惠', '折扣', '促销', '首单'],
    keywords_es: ['precio', 'cuánto cuesta', 'plan', 'planes', 'barato', 'caro', 'descuento', 'oferta', 'promoción'],
    response:
      "Thank you for your interest. EvairSIM offers competitive pricing across more than 190 countries.\n\n" +
      "As a new customer, you are eligible for **50% off your first order**.\n\n" +
      "We offer two product lines:\n\n" +
      "**eSIM plans** (single-country and multi-country)\n" +
      "- 1 GB / 7 days — from $0.99\n" +
      "- 3 GB / 30 days — from $3.99\n" +
      "- 5 GB / 30 days — from $7.50\n" +
      "- 10 GB / 30 days — from $12.50\n" +
      "- Regional and global multi-country plans are also available.\n\n" +
      "**Physical SIM plans** (US data only)\n" +
      "- Plans start from $8.99.\n\n" +
      "All plans include mobile hotspot sharing and 5G / 4G LTE where the underlying network supports it. Final pricing depends on destination and plan duration.",
    response_zh:
      "感谢您的关注。EvairSIM 覆盖 190 多个国家和地区，定价具有竞争力。\n\n" +
      "新客户首单可享 **五折优惠**。\n\n" +
      "我们提供两条产品线：\n\n" +
      "**eSIM 套餐**（单国与多国）\n" +
      "- 1 GB / 7 天——低至 $0.99\n" +
      "- 3 GB / 30 天——低至 $3.99\n" +
      "- 5 GB / 30 天——低至 $7.50\n" +
      "- 10 GB / 30 天——低至 $12.50\n" +
      "- 另有地区与全球多国套餐可选。\n\n" +
      "**实体 SIM 卡套餐**（仅限美国数据）\n" +
      "- 套餐起价 $8.99。\n\n" +
      "所有套餐均支持热点共享及 5G / 4G LTE（视当地运营商支持情况）。最终价格取决于目的地与套餐时长。",
    response_es:
      "Gracias por su interés. EvairSIM ofrece precios competitivos con cobertura en más de 190 países.\n\n" +
      "Como cliente nuevo, tiene **un 50% de descuento en su primer pedido**.\n\n" +
      "Disponemos de dos líneas de producto:\n\n" +
      "**Planes eSIM** (un país y multi-país)\n" +
      "- 1 GB / 7 días — desde $0.99\n" +
      "- 3 GB / 30 días — desde $3.99\n" +
      "- 5 GB / 30 días — desde $7.50\n" +
      "- 10 GB / 30 días — desde $12.50\n" +
      "- También ofrecemos planes regionales y globales.\n\n" +
      "**Planes SIM física** (solo datos en EE. UU.)\n" +
      "- Desde $8.99.\n\n" +
      "Todos los planes incluyen compartición de datos (hotspot) y 5G / 4G LTE donde la red lo permita. El precio final depende del destino y la duración del plan.",
  },
  {
    keywords: ['network', 'coverage', 'country', 'countries', 'roaming', 'signal', '5g', '4g', 'lte', 'speed', 'slow'],
    keywords_zh: ['网络', '覆盖', '国家', '漫游', '信号', '网速', '慢', '速度'],
    keywords_es: ['red', 'cobertura', 'país', 'países', 'roaming', 'señal', 'velocidad', 'lento'],
    response:
      "EvairSIM provides coverage in more than 190 countries and regions worldwide.\n\n" +
      "We partner with leading local carriers in each destination to deliver the best available experience:\n\n" +
      "- **Speed**: 4G LTE, and 5G where the underlying network supports it.\n" +
      "- **Hotspot**: included on all plans at no additional charge.\n" +
      "- **Roaming**: handled seamlessly, with no surprise fees on top of your plan.\n\n" +
      "You can review all supported destinations and the partner networks used in each one from the **Shop** tab of the Evair app.",
    response_zh:
      "EvairSIM 覆盖全球 190 多个国家和地区。\n\n" +
      "我们在每个目的地与领先的本地运营商合作，为您提供最佳的网络体验：\n\n" +
      "- **网速**：4G LTE，当地支持的情况下提供 5G。\n" +
      "- **热点**：所有套餐均免费支持。\n" +
      "- **漫游**：无缝衔接，不会在套餐之外产生额外费用。\n\n" +
      "您可以在 Evair 应用的 **商店** 标签中查看所有支持的国家/地区及其合作的运营商。",
    response_es:
      "EvairSIM ofrece cobertura en más de 190 países y regiones en todo el mundo.\n\n" +
      "Colaboramos con los principales operadores locales de cada destino para ofrecerle la mejor experiencia disponible:\n\n" +
      "- **Velocidad**: 4G LTE, y 5G donde la red local lo admita.\n" +
      "- **Hotspot**: incluido en todos los planes sin coste adicional.\n" +
      "- **Roaming**: gestionado de forma transparente, sin cargos inesperados adicionales al plan.\n\n" +
      "Puede consultar todos los destinos compatibles y los operadores asociados desde la pestaña **Tienda** de la aplicación Evair.",
  },
  {
    keywords: ['not working', 'doesnt work', "doesn't work", 'problem', 'issue', 'error', 'fail', 'failed', 'help', 'trouble', 'no service', 'no signal', 'no internet', 'cant connect', "can't connect", 'fix'],
    keywords_zh: ['不能用', '不工作', '没信号', '问题', '错误', '失败', '没网', '连不上', '没有服务', '修复', '帮助', '故障'],
    keywords_es: ['no funciona', 'problema', 'error', 'falla', 'sin servicio', 'sin señal', 'sin internet', 'no puedo conectar', 'arreglar'],
    response:
      "I am sorry to hear you are experiencing difficulties. I can help you work through the most common causes:\n\n" +
      "1. **Toggle airplane mode off and on** to refresh the radio connection.\n" +
      "2. **Confirm data roaming is enabled**:\n" +
      "   - iOS: **Settings > Cellular > Cellular Data Options > Data Roaming**.\n" +
      "   - Android: **Settings > Network > Mobile Data > Roaming**.\n" +
      "3. **Select a network manually**: open **Settings > Carrier**, disable automatic selection, then choose one of the supported partner carriers.\n" +
      "4. **Restart your device**.\n" +
      "5. **Verify the plan is still valid** in the **My SIMs** tab.\n\n" +
      "If the issue continues after these steps, please share your device model and the country you are connecting from, and I will look into it further on your behalf.",
    response_zh:
      "得知您遇到使用问题，我们深感抱歉。我可以帮您逐步排查最常见的原因：\n\n" +
      "1. **开关飞行模式一次**，以刷新网络连接。\n" +
      "2. **确认数据漫游已开启**：\n" +
      "   - iOS：**设置 > 蜂窝网络 > 蜂窝数据选项 > 数据漫游**。\n" +
      "   - Android：**设置 > 网络 > 移动数据 > 漫游**。\n" +
      "3. **手动选择网络**：进入 **设置 > 运营商**，关闭自动选择，从可用列表中选择一家合作运营商。\n" +
      "4. **重启设备**。\n" +
      "5. 在 **我的 SIM 卡** 标签中**确认套餐仍在有效期内**。\n\n" +
      "如果以上步骤后仍未解决,请告知您的设备型号及所在国家/地区,我会进一步为您跟进。",
    response_es:
      "Lamento que esté experimentando dificultades. Con gusto le guío por las comprobaciones habituales:\n\n" +
      "1. **Active y desactive el modo avión** para refrescar la conexión de radio.\n" +
      "2. **Confirme que el roaming de datos está activado**:\n" +
      "   - iOS: **Ajustes > Datos móviles > Opciones de datos móviles > Roaming**.\n" +
      "   - Android: **Ajustes > Red > Datos móviles > Roaming**.\n" +
      "3. **Seleccione la red manualmente**: en **Ajustes > Operador**, desactive la selección automática y elija un operador asociado compatible.\n" +
      "4. **Reinicie su dispositivo**.\n" +
      "5. **Verifique que el plan siga vigente** en la pestaña **Mis SIMs**.\n\n" +
      "Si el problema persiste tras estos pasos, le ruego indicarme el modelo de su dispositivo y el país desde el que se conecta, y continuaré la investigación por usted.",
  },
  {
    keywords: ['bill', 'billing', 'payment', 'pay', 'charge', 'charged', 'receipt', 'invoice', 'credit card', 'transaction', 'stripe', 'apple pay', 'double charge'],
    keywords_zh: ['账单', '付款', '支付', '扣费', '收据', '发票', '信用卡', '交易', '账单问题', '重复扣费', '多扣了'],
    keywords_es: ['factura', 'pago', 'cobro', 'recibo', 'tarjeta de crédito', 'transacción', 'cobro doble'],
    response:
      "I can help with questions regarding billing and payments.\n\n" +
      "- **Accepted payment methods**: all major credit and debit cards (processed by Stripe), plus Apple Pay and Google Pay.\n" +
      "- **Receipts**: sent automatically by email after each successful purchase. You can also review them under **Profile > Orders** in the app.\n" +
      "- **Duplicate or unexpected charge**:\n" +
      "  1. Please check whether the charge is a pending authorization. Authorizations are released automatically by your card issuer, usually within 3 to 7 business days.\n" +
      "  2. If the charge has posted and is truly duplicated, share the transaction date, amount and order number, and we will investigate.\n" +
      "  3. Confirmed duplicate charges are refunded within 3 to 5 business days.\n\n" +
      "If you would like to request a refund, please type \"refund\" or share your order details and I will guide you through the next steps.",
    response_zh:
      "关于账单与付款,我很乐意为您解答。\n\n" +
      "- **支持的支付方式**：所有主流信用卡与借记卡（由 Stripe 处理）,以及 Apple Pay 与 Google Pay。\n" +
      "- **收据**：每次成功支付后会自动发送至您的邮箱。您也可以在应用的 **个人中心 > 订单** 中查看。\n" +
      "- **重复或异常扣款**：\n" +
      "  1. 请先确认是否为预授权。预授权通常由发卡行在 3 至 7 个工作日内自动释放。\n" +
      "  2. 如确为重复入账,请提供交易日期、金额及订单号,我们会进行核查。\n" +
      "  3. 确认为重复扣款的订单,将在 3 至 5 个工作日内退款。\n\n" +
      "如需申请退款,请回复\"退款\"或提供订单信息,我会协助您完成后续流程。",
    response_es:
      "Con gusto le asisto en cuestiones de facturación y pagos.\n\n" +
      "- **Métodos de pago aceptados**: todas las principales tarjetas de crédito y débito (procesadas por Stripe), además de Apple Pay y Google Pay.\n" +
      "- **Recibos**: se envían automáticamente por correo tras cada compra. También puede consultarlos en **Perfil > Pedidos** dentro de la aplicación.\n" +
      "- **Cargo duplicado o inesperado**:\n" +
      "  1. Le rogamos verificar si se trata de una autorización pendiente. Las autorizaciones las libera el banco emisor, normalmente en 3 a 7 días hábiles.\n" +
      "  2. Si el cargo ya se liquidó y está realmente duplicado, indíquenos la fecha, el importe y el número de pedido para investigarlo.\n" +
      "  3. Los duplicados confirmados se reembolsan en 3 a 5 días hábiles.\n\n" +
      "Si desea solicitar un reembolso, escriba \"reembolso\" o comparta los datos del pedido y le guiaré en el proceso.",
  },
  {
    keywords: ['refund', 'money back', 'get refund', 'want refund', 'refund policy', 'return', 'refund process', 'how to refund', 'request refund'],
    keywords_zh: ['退款', '退钱', '怎么退款', '退款政策', '想退款', '要退款', '退费', '退回', '申请退款', '退款流程'],
    keywords_es: ['reembolso', 'devolver dinero', 'política de reembolso', 'quiero reembolso', 'solicitar reembolso', 'proceso de reembolso'],
    response:
      "I understand, and I am glad to walk you through our refund policy.\n\n" +
      "**Eligible for a full refund within 30 days of purchase**\n" +
      "- An eSIM that has been purchased but **not yet installed or activated**.\n" +
      "- A physical SIM that has been ordered but **not yet shipped**.\n" +
      "- Duplicate or accidental purchases.\n\n" +
      "**Eligible for a partial refund or account credit, reviewed case by case**\n" +
      "- An eSIM that has been installed but has experienced persistent technical issues we were unable to resolve.\n" +
      "- A physical SIM that was received but found to be defective.\n\n" +
      "**Not eligible for a refund**\n" +
      "- An eSIM that has been installed and data has been used.\n" +
      "- A plan that has already expired.\n\n" +
      "**How to request a refund**\n" +
      "1. Please share your **order number** or the **email address** used at checkout.\n" +
      "2. Briefly explain the **reason** for the request so we can review it fairly.\n" +
      "3. Approved refunds are returned to the original payment method within **3 to 5 business days**.\n\n" +
      "If you would like to proceed, please share the details and I will open a case on your behalf.",
    response_zh:
      "我理解您的诉求,请允许我为您介绍退款政策。\n\n" +
      "**可享受全额退款（购买后 30 天内）**\n" +
      "- eSIM 已购买但**尚未安装或激活**。\n" +
      "- 实体 SIM 卡已下单但**尚未发货**。\n" +
      "- 重复下单或误操作购买。\n\n" +
      "**可视情况给予部分退款或账户抵扣**\n" +
      "- eSIM 已安装,但持续出现我们无法解决的技术问题。\n" +
      "- 实体 SIM 卡收到后存在质量缺陷。\n\n" +
      "**不予退款**\n" +
      "- eSIM 已安装并已使用流量。\n" +
      "- 套餐已到期。\n\n" +
      "**如何申请退款**\n" +
      "1. 请提供您的**订单号**或下单时使用的**邮箱地址**。\n" +
      "2. 简要说明**退款原因**,便于我们公正审核。\n" +
      "3. 审核通过后,款项将在 **3 至 5 个工作日内**按原支付方式退回。\n\n" +
      "如需继续办理,请提供相关信息,我将为您开立工单跟进。",
    response_es:
      "Por supuesto, con gusto le explico nuestra política de reembolsos.\n\n" +
      "**Reembolso completo dentro de los 30 días posteriores a la compra**\n" +
      "- eSIM adquirida pero **aún no instalada ni activada**.\n" +
      "- SIM física pedida pero **aún no enviada**.\n" +
      "- Compras duplicadas o accidentales.\n\n" +
      "**Reembolso parcial o crédito, revisado caso por caso**\n" +
      "- eSIM instalada con problemas técnicos persistentes que no pudimos resolver.\n" +
      "- SIM física recibida con defectos.\n\n" +
      "**No elegibles para reembolso**\n" +
      "- eSIM instalada con datos ya consumidos.\n" +
      "- Planes ya expirados.\n\n" +
      "**Cómo solicitar un reembolso**\n" +
      "1. Comparta su **número de pedido** o el **correo electrónico** utilizado en la compra.\n" +
      "2. Explique brevemente el **motivo** para que podamos revisarlo adecuadamente.\n" +
      "3. Los reembolsos aprobados se acreditan al método de pago original en **3 a 5 días hábiles**.\n\n" +
      "Si desea continuar, comparta los datos y abriré un caso en su nombre.",
    followUp: "Please share your order number and the reason for the refund, and I will initiate the case right away.",
    followUp_zh: "请提供您的订单号和退款原因,我会立即为您开立工单跟进。",
    followUp_es: "Comparta su número de pedido y el motivo del reembolso, y abriré el caso de inmediato.",
  },
  {
    keywords: ['ship', 'shipping', 'delivery', 'deliver', 'arrive', 'tracking', 'physical', 'mail', 'how long'],
    keywords_zh: ['快递', '发货', '配送', '到货', '物流', '追踪', '寄', '多久到', '运费'],
    keywords_es: ['envío', 'entrega', 'llegar', 'rastreo', 'correo', 'cuánto tarda'],
    response:
      "Here are the current shipping details for our physical SIM cards:\n\n" +
      "- **Availability**: United States shipping only at this time.\n" +
      "- **Fulfilment**: orders are fulfilled by **Amazon** under the Fulfilment by Amazon (FBA) programme.\n" +
      "- **Processing time**: typically 1 to 2 business days.\n" +
      "- **Delivery time**: typically 3 to 5 business days within the United States.\n" +
      "- **Tracking**: a tracking email is sent by Amazon directly once the parcel is dispatched.\n\n" +
      "If you need connectivity immediately, our **eSIM plans** are delivered digitally and are usable right away, without any wait for shipping.\n\n" +
      "We also offer EvairSIM on **Amazon** and other marketplaces for your convenience.",
    response_zh:
      "以下是我们实体 SIM 卡目前的配送信息：\n\n" +
      "- **配送范围**：目前仅支持美国境内配送。\n" +
      "- **履约方式**：订单通过 **Amazon FBA（亚马逊物流）** 完成履约。\n" +
      "- **处理时间**：通常为 1 至 2 个工作日。\n" +
      "- **送达时间**：美国境内通常为 3 至 5 个工作日。\n" +
      "- **物流追踪**：包裹寄出后,亚马逊会直接向您发送追踪邮件。\n\n" +
      "如需立即联网,建议选择我们的 **eSIM 套餐**,交付即刻完成,无需等待快递。\n\n" +
      "我们也在 **Amazon** 及其他电商平台上架了 EvairSIM,便于您购买。",
    response_es:
      "A continuación encontrará la información actual de envío de nuestras SIM físicas:\n\n" +
      "- **Disponibilidad**: por ahora solo realizamos envíos dentro de Estados Unidos.\n" +
      "- **Gestión**: los pedidos se gestionan mediante el programa **Fulfilment by Amazon (FBA)**.\n" +
      "- **Tiempo de procesamiento**: normalmente de 1 a 2 días hábiles.\n" +
      "- **Tiempo de entrega**: normalmente de 3 a 5 días hábiles dentro de EE. UU.\n" +
      "- **Seguimiento**: Amazon envía directamente un correo de seguimiento una vez despachado el paquete.\n\n" +
      "Si necesita conectividad de inmediato, nuestros **planes eSIM** se entregan digitalmente y pueden utilizarse al instante, sin esperar envío.\n\n" +
      "También encontrará EvairSIM disponible en **Amazon** y otros marketplaces para su comodidad.",
  },
  {
    keywords: ['expire', 'expiry', 'expiration', 'validity', 'valid', 'how long last', 'duration', 'renew', 'extend'],
    keywords_zh: ['过期', '有效期', '到期', '多长时间', '续期', '延长', '有效'],
    keywords_es: ['expirar', 'vencimiento', 'validez', 'cuánto dura', 'duración', 'renovar', 'extender'],
    response:
      "The validity period of your plan depends on the product type:\n\n" +
      "- **Most eSIM plans**: the validity clock begins when data is first used in the destination country, not at the moment of purchase.\n" +
      "- **Physical SIM plans**: the validity clock begins when the profile is enabled or activated.\n\n" +
      "To review the expiry date and remaining data, please open the **My eSIMs / SIMs** tab. Both are displayed on the SIM card details view.\n\n" +
      "Plan durations commonly available include 7, 15, 30, 60, 90 and 180 days, depending on the destination.\n\n" +
      "If you would like to maintain uninterrupted service, you may purchase a new plan or, where supported, top up the current one before it expires.",
    response_zh:
      "套餐有效期取决于产品类型:\n\n" +
      "- **大多数 eSIM 套餐**:有效期自您在目的地首次使用数据时开始计算,而非下单时刻。\n" +
      "- **实体 SIM 卡套餐**:有效期自配置文件启用或激活时开始计算。\n\n" +
      "您可以在 **我的 SIM 卡** 标签中查看到期日期及剩余流量,详情会显示在卡片详细信息页。\n\n" +
      "根据不同目的地,常见的套餐时长包括 7、15、30、60、90 与 180 天。\n\n" +
      "如希望保持持续的联网服务,您可以在当前套餐到期前购买新套餐,或(对于支持的套餐)进行充值。",
    response_es:
      "El periodo de validez de su plan depende del tipo de producto:\n\n" +
      "- **La mayoría de los planes eSIM**: la validez comienza cuando utiliza datos por primera vez en el país de destino, no en el momento de la compra.\n" +
      "- **Planes SIM física**: la validez comienza al activar el perfil.\n\n" +
      "Para consultar la fecha de vencimiento y el saldo restante, abra la pestaña **Mis eSIMs / SIMs**. Ambos datos se muestran en el detalle de la tarjeta.\n\n" +
      "Las duraciones habituales incluyen 7, 15, 30, 60, 90 y 180 días, según el destino.\n\n" +
      "Si desea mantener el servicio de forma ininterrumpida, puede adquirir un nuevo plan o, en los planes compatibles, recargar antes de la expiración.",
  },
  {
    keywords: ['hotspot', 'tether', 'tethering', 'share', 'wifi', 'share data', 'personal hotspot'],
    keywords_zh: ['热点', '共享', '分享网络', '个人热点', 'WiFi共享'],
    keywords_es: ['hotspot', 'compartir', 'wifi', 'compartir datos', 'punto de acceso'],
    response:
      "Yes, every EvairSIM plan supports mobile hotspot sharing at no additional cost.\n\n" +
      "To enable it:\n\n" +
      "- **iPhone**: **Settings > Personal Hotspot > Allow Others to Join**.\n" +
      "- **Android**: **Settings > Hotspot & Tethering > Wi-Fi Hotspot**.\n\n" +
      "If your device has multiple SIMs, please confirm that EvairSIM is selected as the active data line before enabling the hotspot.",
    response_zh:
      "是的,所有 EvairSIM 套餐均免费支持热点共享。\n\n" +
      "开启方法:\n\n" +
      "- **iPhone**:**设置 > 个人热点 > 允许其他人加入**。\n" +
      "- **Android**:**设置 > 热点与共享 > Wi-Fi 热点**。\n\n" +
      "若您的设备有多张 SIM 卡,请在开启热点前,确认 EvairSIM 已被设置为当前使用的数据线路。",
    response_es:
      "Sí, todos los planes de EvairSIM admiten compartir datos (hotspot) sin coste adicional.\n\n" +
      "Para activarlo:\n\n" +
      "- **iPhone**: **Ajustes > Hotspot personal > Permitir que otros se unan**.\n" +
      "- **Android**: **Ajustes > Hotspot y anclaje > Hotspot Wi-Fi**.\n\n" +
      "Si su dispositivo tiene varias SIM, confirme que EvairSIM está seleccionada como la línea de datos activa antes de activar el hotspot.",
  },
  {
    keywords: ['account', 'profile', 'login', 'log in', 'sign in', 'password', 'email', 'change email', 'change password', 'forgot password', 'delete account'],
    keywords_zh: ['账户', '账号', '登录', '密码', '邮箱', '修改密码', '忘记密码', '注销', '删除账户'],
    keywords_es: ['cuenta', 'perfil', 'iniciar sesión', 'contraseña', 'correo', 'cambiar contraseña', 'olvidé contraseña', 'eliminar cuenta'],
    response:
      "Here is where to manage each account setting:\n\n" +
      "- **View or edit your profile**: **Profile > Account Information**.\n" +
      "- **Change your password**: **Profile > Account Information**, then tap **Edit** beside the password field.\n" +
      "- **Change your email address**: please contact our support team. For security reasons an email change requires verification.\n" +
      "- **Reset a forgotten password**: tap **Forgot Password** on the sign-in screen and we will send a reset link to your registered email.\n" +
      "- **Delete your account**: **Profile > Account Information**, at the bottom of the page.\n\n" +
      "Please let me know if you would like me to walk you through any of these steps.",
    response_zh:
      "以下是各项账户设置的入口:\n\n" +
      "- **查看或编辑资料**:**个人中心 > 账户信息**。\n" +
      "- **修改密码**:**个人中心 > 账户信息**,点击密码旁的 **编辑**。\n" +
      "- **修改邮箱**:出于安全考虑,更换邮箱需要验证,请联系我们的客服团队。\n" +
      "- **重置忘记的密码**:在登录页面点击 **忘记密码**,我们会向您注册时的邮箱发送重置链接。\n" +
      "- **注销账户**:**个人中心 > 账户信息**,页面底部。\n\n" +
      "如需协助完成上述任一步骤,请告诉我。",
    response_es:
      "Estas son las rutas para cada ajuste de cuenta:\n\n" +
      "- **Ver o editar su perfil**: **Perfil > Información de la cuenta**.\n" +
      "- **Cambiar la contraseña**: **Perfil > Información de la cuenta**, pulse **Editar** junto al campo de contraseña.\n" +
      "- **Cambiar el correo electrónico**: por motivos de seguridad es necesaria una verificación; le rogamos contactar con nuestro equipo de soporte.\n" +
      "- **Restablecer contraseña olvidada**: pulse **¿Olvidó su contraseña?** en la pantalla de inicio de sesión y le enviaremos un enlace al correo registrado.\n" +
      "- **Eliminar la cuenta**: **Perfil > Información de la cuenta**, al final de la página.\n\n" +
      "Quedo atenta a si desea que le guíe en cualquiera de estos pasos.",
  },
  {
    keywords: ['cancel', 'cancellation', 'cancel order', 'cancel plan', 'stop'],
    keywords_zh: ['取消', '取消订单', '退订', '不要了'],
    keywords_es: ['cancelar', 'cancelación', 'cancelar pedido', 'cancelar plan'],
    response:
      "I can help with cancellation questions. The options depend on the current state of your order:\n\n" +
      "- **eSIM not yet activated**: you are eligible for a full refund. Please share your order number and we will process it.\n" +
      "- **eSIM already activated**: activated eSIMs cannot be cancelled. In some cases we may be able to apply unused data as a credit toward a new plan, subject to review.\n" +
      "- **Physical SIM still in transit**: the order can be cancelled at any point before the carrier dispatches it, with a full refund.\n\n" +
      "Please let me know which of these applies and I will take the next step for you.",
    response_zh:
      "关于取消,我很乐意协助您处理。具体方案取决于订单当前的状态:\n\n" +
      "- **eSIM 尚未激活**:可申请全额退款,请提供订单号,我们会立即处理。\n" +
      "- **eSIM 已激活**:已激活的 eSIM 无法取消。如有未使用的流量,可视情况以积分形式抵扣新套餐。\n" +
      "- **实体 SIM 卡仍在运送中**:发货前可随时取消,全额退款。\n\n" +
      "请告诉我属于哪一种情况,我会为您接续处理。",
    response_es:
      "Con gusto le asisto con la cancelación. Las opciones dependen del estado actual del pedido:\n\n" +
      "- **eSIM no activada**: se puede emitir un reembolso completo. Comparta su número de pedido y procederemos.\n" +
      "- **eSIM ya activada**: lamentablemente no es posible cancelarla. Cuando sea viable, los datos no utilizados podrían aplicarse como crédito para un nuevo plan, sujeto a revisión.\n" +
      "- **SIM física aún en tránsito**: puede cancelarse en cualquier momento antes del despacho, con reembolso completo.\n\n" +
      "Indíqueme cuál es su caso y continuaré con el siguiente paso por usted.",
  },
  {
    keywords: ['human', 'agent', 'real person', 'speak to someone', 'talk to person', 'live chat', 'representative', 'operator', 'transfer'],
    keywords_zh: ['人工', '客服', '真人', '转接', '找人', '人工客服', '在线客服'],
    keywords_es: ['humano', 'agente', 'persona real', 'hablar con alguien', 'representante', 'operador', 'transferir'],
    response:
      "Of course. I have forwarded this conversation to our support team and a live agent will join shortly. During business hours our typical response time is within two hours.\n\n" +
      "While you wait, it would help if you could describe your issue in as much detail as possible — including your order number, ICCID, device model and country when relevant — so that the agent can assist you as quickly as possible once they join.",
    response_zh:
      "好的。我已将本对话转交至客服团队,真人客服将尽快加入。工作时间内的平均响应时间约为两小时。\n\n" +
      "在等待期间,如您能尽量提供详细信息,包括订单号、ICCID、设备型号以及所在国家等,客服接入后便能更快为您处理。",
    response_es:
      "Por supuesto. He trasladado esta conversación a nuestro equipo de soporte y un agente se unirá en breve. En horario laboral, nuestro tiempo de respuesta habitual es de dos horas.\n\n" +
      "Mientras tanto, si puede describir su problema con el mayor detalle posible (incluyendo número de pedido, ICCID, modelo de dispositivo y país si procede), el agente podrá atenderle con mayor rapidez.",
  },
  {
    keywords: ['multiple', 'dual sim', 'two sim', 'switch', 'more than one', 'several', 'another sim'],
    keywords_zh: ['多张卡', '双卡', '切换', '换卡', '另一张'],
    keywords_es: ['múltiple', 'doble sim', 'dos sim', 'cambiar', 'otra sim'],
    response:
      "Yes, you can use several EvairSIM plans at the same time.\n\n" +
      "- **Dual SIM devices**: you can keep your home SIM active for calls and messages while using EvairSIM as your data line.\n" +
      "- **Multiple destinations**: you may purchase a separate plan for each country, or pick one of our regional or global plans to cover the whole trip with a single SIM.\n\n" +
      "All of your SIMs are listed in the **My eSIMs / SIMs** tab, where you can review each one and switch the active data line.",
    response_zh:
      "是的,您可以同时使用多张 EvairSIM。\n\n" +
      "- **双卡设备**:可保留本国 SIM 卡用于通话与短信,同时使用 EvairSIM 作为数据线路。\n" +
      "- **多个目的地**:可为每个国家分别购买套餐,也可以选择我们的地区或全球套餐,以一张 SIM 覆盖整段行程。\n\n" +
      "所有 SIM 卡都会在 **我的 SIM 卡** 标签中列出,您可查看详情并切换当前的数据线路。",
    response_es:
      "Sí, puede utilizar varios planes EvairSIM al mismo tiempo.\n\n" +
      "- **Dispositivos dual SIM**: puede mantener su SIM local para llamadas y mensajes y usar EvairSIM como línea de datos.\n" +
      "- **Varios destinos**: puede comprar un plan por país o, si lo prefiere, elegir un plan regional o global que cubra todo el viaje con una sola SIM.\n\n" +
      "Todas sus SIM aparecen en la pestaña **Mis eSIMs / SIMs**, desde donde puede revisarlas y cambiar la línea de datos activa.",
  },
  {
    keywords: ['what is evair', 'about evair', 'who are you', 'tell me about', 'evairsim', 'evair sim'],
    keywords_zh: ['什么是', '关于', '你是谁', '介绍', 'Evair是什么'],
    keywords_es: ['qué es evair', 'sobre evair', 'quién eres', 'cuéntame sobre'],
    response:
      "Thank you for asking. EvairSIM provides affordable mobile data for travellers worldwide:\n\n" +
      "- Coverage in more than 190 countries and regions.\n" +
      "- Both eSIM and physical SIM options.\n" +
      "- Instant delivery for eSIMs.\n" +
      "- 50% off your first order as a new customer.\n" +
      "- 5G and 4G LTE speeds, with mobile hotspot included on every plan.\n" +
      "- No roaming surcharges — you pay once for the plan you choose.\n\n" +
      "You can explore our plans in the **Shop** tab, or let me know which destination you are travelling to and I can suggest the most suitable option.",
    response_zh:
      "很高兴向您介绍。EvairSIM 致力于为全球旅行者提供实惠的移动数据服务:\n\n" +
      "- 覆盖超过 190 个国家和地区。\n" +
      "- 提供 eSIM 与实体 SIM 卡两种形态。\n" +
      "- eSIM 即时交付。\n" +
      "- 新客户首单享 5 折优惠。\n" +
      "- 5G 与 4G LTE 高速网络,所有套餐均支持热点共享。\n" +
      "- 无漫游附加费——一次付费,随处可用。\n\n" +
      "您可以在 **商店** 标签中浏览所有套餐,也可以告诉我您的目的地,我会为您推荐合适的选择。",
    response_es:
      "Gracias por su interés. EvairSIM ofrece datos móviles asequibles para viajeros de todo el mundo:\n\n" +
      "- Cobertura en más de 190 países y regiones.\n" +
      "- Disponible como eSIM y como SIM física.\n" +
      "- Entrega instantánea para eSIMs.\n" +
      "- 50% de descuento en el primer pedido para clientes nuevos.\n" +
      "- Velocidades 5G y 4G LTE, con hotspot incluido en cada plan.\n" +
      "- Sin recargos por roaming: se paga una sola vez por el plan elegido.\n\n" +
      "Puede explorar nuestros planes en la pestaña **Tienda**, o indíqueme su destino y le recomendaré la opción más adecuada.",
  },
  {
    keywords: ['ecard', 'e-card', 'evair ecard', 'what is ecard', 'physical esim', 'esim card', 'esim chip', 'euicc'],
    keywords_zh: ['eCard', '实体eSIM', 'eSIM卡', '芯片卡', 'eUICC'],
    keywords_es: ['ecard', 'tarjeta esim', 'chip esim', 'esim física'],
    response:
      "The **Evair eCard** is a physical SIM card with an embedded eUICC chip. It brings eSIM technology to any phone, including those that do not natively support built-in eSIM.\n\n" +
      "- Insert the eCard like a standard nano-SIM.\n" +
      "- eSIM profiles are **pre-loaded at the factory**, so no profile download is required.\n" +
      "- Bind the card in the Evair app to begin using data.\n" +
      "- Works on both **Android** and **iPhone**.\n" +
      "- Supports **5G** networks where available.\n\n" +
      "Under the hood, the eCard uses eUICC technology (the GSMA SGP.22 standard), which is the same underlying technology found in modern smartphones, delivered in a convenient nano-SIM form factor.",
    response_zh:
      "**Evair eCard** 是一张内置 eUICC 芯片的实体 SIM 卡,可让任何手机(包括不支持内置 eSIM 的设备)也能享受 eSIM 技术带来的便利。\n\n" +
      "- 像普通 nano-SIM 卡一样插入即可使用。\n" +
      "- eSIM 配置文件已在**出厂前预装**,无需下载。\n" +
      "- 在 Evair 应用中绑定卡片后即可使用数据。\n" +
      "- 同时兼容 **Android** 与 **iPhone**。\n" +
      "- 支持当地可用的 **5G** 网络。\n\n" +
      "Evair eCard 采用 eUICC(GSMA SGP.22 标准)技术,与现代智能手机内置的 eSIM 技术相同,以便携的 nano-SIM 形态呈现。",
    response_es:
      "El **Evair eCard** es una tarjeta SIM física con chip eUICC integrado. Lleva la tecnología eSIM a cualquier teléfono, incluidos aquellos que no admiten eSIM integrado de fábrica.\n\n" +
      "- Se inserta como una nano-SIM estándar.\n" +
      "- Los perfiles eSIM vienen **precargados de fábrica**, por lo que no es necesario descargarlos.\n" +
      "- Vincule la tarjeta en la aplicación Evair para comenzar a utilizar datos.\n" +
      "- Funciona en **Android** e **iPhone**.\n" +
      "- Admite redes **5G** donde estén disponibles.\n\n" +
      "Internamente, el eCard emplea la tecnología eUICC (estándar GSMA SGP.22), la misma base presente en los smartphones modernos, entregada en un formato nano-SIM.",
    followUp: "Would you like guidance on setting up your eCard, or details on the available plans?",
    followUp_zh: "需要我为您介绍如何设置 eCard,或查看可选套餐吗?",
    followUp_es: "¿Desea que le oriente en la configuración del eCard o le muestre los planes disponibles?",
  },
  {
    keywords: ['amazon', 'marketplace', 'temu', 'bought online', 'bought from', 'third party', 'ebay', 'already have sim', 'received sim', 'got my sim'],
    keywords_zh: ['亚马逊', '电商', '第三方', '已收到', '拿到卡了', '淘宝', '拼多多'],
    keywords_es: ['amazon', 'mercado', 'tercero', 'ya recibí', 'compré en'],
    response:
      "Thank you for choosing EvairSIM. If you purchased from Amazon or another marketplace, here is how to get started:\n\n" +
      "1. **Create an account** in the Evair app using your email address.\n" +
      "2. **Bind your SIM**: go to **SIM Card > Set Up Now**.\n" +
      "3. **Scan or enter the ICCID** (the 19 to 20 digit number printed on the SIM card).\n" +
      "4. **Insert the SIM** and you will be ready to use data.\n\n" +
      "Your SIM card ships with an eSIM profile that is already active. You only need to bind it to your account to manage your data usage and future top-ups.",
    response_zh:
      "感谢您选择 EvairSIM。若您是在亚马逊或其他电商平台购买,以下是开始使用的步骤:\n\n" +
      "1. **注册账户**:使用您的邮箱在 Evair 应用中注册。\n" +
      "2. **绑定 SIM 卡**:进入 **SIM 卡 > 立即设置**。\n" +
      "3. **扫描或输入 ICCID**:即 SIM 卡上印的 19 至 20 位数字。\n" +
      "4. **插入 SIM 卡**:即可开始使用数据。\n\n" +
      "您收到的 SIM 卡已预置 eSIM 配置文件,只需绑定到账户,即可便捷管理流量及后续充值。",
    response_es:
      "Gracias por elegir EvairSIM. Si realizó su compra en Amazon u otro marketplace, estos son los pasos para comenzar:\n\n" +
      "1. **Cree una cuenta** en la aplicación Evair con su correo electrónico.\n" +
      "2. **Vincule su SIM**: vaya a **SIM Card > Configurar ahora**.\n" +
      "3. **Escanee o introduzca el ICCID** (número de 19 a 20 dígitos impreso en la tarjeta).\n" +
      "4. **Inserte la SIM** y estará listo para navegar.\n\n" +
      "Su tarjeta SIM ya incluye un perfil eSIM activo de fábrica. Solo necesita vincularla a su cuenta para gestionar el uso de datos y las recargas futuras.",
  },
  {
    keywords: ['delete esim', 'remove esim', 'uninstall esim', 'deleted esim', 'accidentally deleted', 'lost esim', 'reinstall', 'recover esim', 'restore esim'],
    keywords_zh: ['删除eSIM', '卸载eSIM', '误删', '恢复eSIM', '重新安装', '丢失', 'eSIM没了'],
    keywords_es: ['eliminar esim', 'borrar esim', 'desinstalar', 'eliminé accidentalmente', 'recuperar esim', 'restaurar'],
    response:
      "Important information about eSIM deletion, please read carefully:\n\n" +
      "An eSIM profile can only be installed **one time**. Once it is removed from the device, the profile **cannot be recovered or reinstalled**.\n\n" +
      "If an eSIM was deleted accidentally, please note the following:\n\n" +
      "- The original profile cannot be restored.\n" +
      "- A new eSIM plan would need to be purchased to continue service.\n" +
      "- Please reach out to our support team. Where circumstances allow, we can offer a goodwill discount on a replacement plan.\n\n" +
      "A helpful tip for future use: if you are pausing travel, you can **disable** the eSIM in your device settings rather than deleting it. The profile will remain on the device and can be re-enabled whenever you are ready.",
    response_zh:
      "关于删除 eSIM 的重要提示,请您留意:\n\n" +
      "eSIM 配置文件仅可安装**一次**,一旦从设备中删除,配置文件**将无法恢复或重新安装**。\n\n" +
      "若您不慎删除了 eSIM,请了解:\n\n" +
      "- 原配置文件无法恢复。\n" +
      "- 需要重新购买新的 eSIM 套餐以恢复使用。\n" +
      "- 请联系我们的客服团队,视情况我们可能会为补购套餐提供善意折扣。\n\n" +
      "温馨建议:如您暂时不需要使用,建议在手机设置中**停用** eSIM 而不是删除,配置文件会保留在设备上,随时可以重新启用。",
    response_es:
      "Información importante sobre la eliminación de eSIMs, léala con atención:\n\n" +
      "Un perfil eSIM solo puede instalarse **una vez**. Una vez eliminado del dispositivo, el perfil **no puede recuperarse ni reinstalarse**.\n\n" +
      "Si se eliminó un eSIM por accidente, tenga en cuenta lo siguiente:\n\n" +
      "- El perfil original no puede restaurarse.\n" +
      "- Sería necesario adquirir un nuevo plan eSIM para continuar el servicio.\n" +
      "- Le rogamos contactar a nuestro equipo de soporte; cuando las circunstancias lo permitan, podemos ofrecer un descuento de cortesía para el reemplazo.\n\n" +
      "Consejo útil para el futuro: si va a pausar su viaje, puede **desactivar** el eSIM en los ajustes del dispositivo en lugar de eliminarlo. El perfil permanecerá en el dispositivo y podrá reactivarse cuando lo necesite.",
  },
  {
    keywords: ['multi country', 'regional', 'global plan', 'multiple countries', 'many countries', 'travel to several', 'europe plan', 'asia plan', 'world plan'],
    keywords_zh: ['多国', '地区套餐', '全球套餐', '多个国家', '欧洲套餐', '亚洲套餐', '跨国'],
    keywords_es: ['multi país', 'regional', 'plan global', 'múltiples países', 'plan europa', 'plan asia', 'plan mundial'],
    response:
      "Yes, we offer multi-country plans tailored to travellers visiting several destinations:\n\n" +
      "- **Regional plans**: cover groups of countries within one region, for example Europe, Southeast Asia or the Middle East.\n" +
      "- **Global plans**: cover more than 50 countries worldwide with a single SIM.\n\n" +
      "How these plans work:\n\n" +
      "- A single purchase provides data usable across every included country.\n" +
      "- There is no need to swap SIMs as you travel between destinations.\n" +
      "- The handover between networks is seamless when you cross a border.\n\n" +
      "You can browse multi-country options under the **Shop** tab by selecting **1 SIM = Many Countries**.",
    response_zh:
      "是的,我们为需要前往多个目的地的旅客准备了多国套餐:\n\n" +
      "- **地区套餐**:覆盖同一地区的多个国家,如欧洲、东南亚或中东等。\n" +
      "- **全球套餐**:一张 SIM 覆盖全球 50 多个国家。\n\n" +
      "使用方式:\n\n" +
      "- 一次购买即可在所有涵盖国家使用流量。\n" +
      "- 跨境时无需更换 SIM 卡。\n" +
      "- 过境时网络切换流畅自然。\n\n" +
      "您可以在 **商店** 标签下选择 **1 SIM = Many Countries(一卡多国)** 浏览多国套餐。",
    response_es:
      "Sí, disponemos de planes multi-país pensados para viajeros que visitan varios destinos:\n\n" +
      "- **Planes regionales**: cubren grupos de países en una misma región, por ejemplo Europa, Sudeste Asiático u Oriente Medio.\n" +
      "- **Planes globales**: cubren más de 50 países con una sola SIM.\n\n" +
      "Su funcionamiento:\n\n" +
      "- Con una sola compra dispone de datos en todos los países incluidos.\n" +
      "- No es necesario cambiar de SIM al viajar entre destinos.\n" +
      "- La transición entre redes al cruzar fronteras es fluida.\n\n" +
      "Puede explorar las opciones multi-país en la pestaña **Tienda**, seleccionando **1 SIM = Many Countries**.",
  },
  {
    keywords: ['bind', 'binding', 'link', 'connect sim', 'register sim', 'pair', 'set up sim', 'setup sim'],
    keywords_zh: ['绑定', '注册卡', '关联', '配对', '设置卡', '绑卡'],
    keywords_es: ['vincular', 'registrar sim', 'conectar sim', 'emparejar', 'configurar sim'],
    response:
      "Happy to walk you through binding your SIM card to your Evair account:\n\n" +
      "1. **Sign in** to the Evair app (or create an account if you do not have one yet).\n" +
      "2. Open the **SIM Card** tab at the top of the home screen.\n" +
      "3. Tap **Set Up Now** in the activation section.\n" +
      "4. **Scan** the barcode printed on your SIM card, or **enter the ICCID** manually.\n" +
      "5. Review the card details and tap **Bind SIM Card** to confirm.\n\n" +
      "Once bound, your SIM will appear under **My SIMs**, where you can track data usage, top up and manage your plan.\n\n" +
      "Please note that you must be signed in before a SIM can be bound to your account.",
    response_zh:
      "很乐意为您介绍如何将 SIM 卡绑定到您的 Evair 账户:\n\n" +
      "1. **登录** Evair 应用(如尚未注册,请先创建账户)。\n" +
      "2. 进入主页顶部的 **SIM 卡** 标签。\n" +
      "3. 点击激活区域中的 **立即设置**。\n" +
      "4. **扫描** SIM 卡上的条形码,或 **手动输入 ICCID**。\n" +
      "5. 确认卡片信息后,点击 **绑定 SIM 卡** 完成。\n\n" +
      "绑定完成后,您的 SIM 卡会显示在 **我的 SIM 卡** 中,可随时查看流量、充值并管理套餐。\n\n" +
      "请注意,绑定之前必须先登录账户。",
    response_es:
      "Con gusto le guío en la vinculación de su SIM a su cuenta Evair:\n\n" +
      "1. **Inicie sesión** en la aplicación Evair (o cree una cuenta si aún no tiene).\n" +
      "2. Abra la pestaña **SIM Card** en la parte superior de la pantalla.\n" +
      "3. Pulse **Configurar ahora** en la sección de activación.\n" +
      "4. **Escanee** el código de barras de la tarjeta o **introduzca el ICCID** manualmente.\n" +
      "5. Revise los detalles y pulse **Vincular SIM** para confirmar.\n\n" +
      "Una vez vinculada, su SIM aparecerá en **Mis SIMs**, desde donde puede consultar el consumo, recargar y gestionar su plan.\n\n" +
      "Tenga en cuenta que es necesario haber iniciado sesión antes de vincular una SIM a la cuenta.",
  },
  {
    keywords: ['no data', 'data not working', 'connected but no internet', 'connected no data', 'apn', 'apn settings', 'access point'],
    keywords_zh: ['没有数据', '连上了但没网', '无法上网', 'APN', '接入点', '有信号没网'],
    keywords_es: ['sin datos', 'conectado sin internet', 'apn', 'punto de acceso', 'no hay internet'],
    response:
      "I am sorry for the inconvenience. When the device shows a network connection but no working internet, please try the following in order:\n\n" +
      "1. **Confirm data roaming is enabled**:\n" +
      "   - iOS: **Settings > Cellular > Cellular Data Options > Data Roaming**.\n" +
      "   - Android: **Settings > Network > Mobile Data > Roaming**.\n\n" +
      "2. **Check the APN settings**. Some networks require manual configuration:\n" +
      "   - iOS: **Settings > Cellular > Cellular Data Network**.\n" +
      "   - Android: **Settings > Network > Access Point Names**.\n" +
      "   - Try setting the APN to **internet** or **globaldata**.\n\n" +
      "3. **Select EvairSIM as the data line**. On a dual SIM device, open **Settings > Cellular > Cellular Data** and select your EvairSIM line.\n\n" +
      "4. **Toggle airplane mode** off and on.\n\n" +
      "5. **Restart your device**.\n\n" +
      "If the connection still does not work, please share your device model and the country you are in, and I will continue to investigate for you.",
    response_zh:
      "很抱歉给您带来不便。若设备显示已连接网络但无法上网,建议您按以下顺序排查:\n\n" +
      "1. **确认数据漫游已开启**:\n" +
      "   - iOS:**设置 > 蜂窝网络 > 蜂窝数据选项 > 数据漫游**。\n" +
      "   - Android:**设置 > 网络 > 移动数据 > 漫游**。\n\n" +
      "2. **检查 APN 设置**,部分网络需要手动配置:\n" +
      "   - iOS:**设置 > 蜂窝网络 > 蜂窝数据网络**。\n" +
      "   - Android:**设置 > 网络 > 接入点名称**。\n" +
      "   - 可尝试将 APN 设置为 **internet** 或 **globaldata**。\n\n" +
      "3. **确认将 EvairSIM 设为数据线路**。双卡设备请在 **设置 > 蜂窝网络 > 蜂窝数据** 中选择 EvairSIM。\n\n" +
      "4. **开关一次飞行模式**。\n\n" +
      "5. **重启设备**。\n\n" +
      "若仍无法上网,烦请提供设备型号及所在国家/地区,我会为您进一步跟进。",
    response_es:
      "Lamento las molestias. Cuando el dispositivo muestra conexión a la red pero no tiene internet, le sugiero revisar en este orden:\n\n" +
      "1. **Confirme que el roaming de datos está activado**:\n" +
      "   - iOS: **Ajustes > Datos móviles > Opciones de datos móviles > Roaming**.\n" +
      "   - Android: **Ajustes > Red > Datos móviles > Roaming**.\n\n" +
      "2. **Revise los ajustes de APN**. Algunas redes requieren configuración manual:\n" +
      "   - iOS: **Ajustes > Datos móviles > Red de datos móviles**.\n" +
      "   - Android: **Ajustes > Red > Nombres de punto de acceso**.\n" +
      "   - Puede probar con APN **internet** o **globaldata**.\n\n" +
      "3. **Seleccione EvairSIM como línea de datos**. En dispositivos dual SIM, vaya a **Ajustes > Datos móviles > Datos móviles** y seleccione su línea EvairSIM.\n\n" +
      "4. **Active y desactive el modo avión**.\n\n" +
      "5. **Reinicie el dispositivo**.\n\n" +
      "Si la situación persiste, indíqueme el modelo de su dispositivo y el país en el que se encuentra, y continuaré investigando por usted.",
  },
  {
    keywords: ['call', 'calls', 'phone call', 'voice', 'sms', 'text message', 'can i call', 'phone number', 'make calls'],
    keywords_zh: ['打电话', '通话', '语音', '短信', '电话号码', '能打电话吗', '拨号'],
    keywords_es: ['llamar', 'llamada', 'voz', 'sms', 'mensaje de texto', 'número de teléfono', 'puedo llamar'],
    response:
      "EvairSIM is a **data-only** service, so voice calls and SMS over the cellular network are not included.\n\n" +
      "You can still make calls and send messages using internet-based applications:\n\n" +
      "- **Voice calls**: WhatsApp, FaceTime, Skype or any other VoIP app.\n" +
      "- **Messaging**: WhatsApp, iMessage (over data), Telegram, WeChat and similar services.\n\n" +
      "A practical tip for travellers: keep your home SIM installed alongside EvairSIM (dual SIM). Your home number remains able to receive calls and verification codes, while EvairSIM handles all of your data needs.",
    response_zh:
      "EvairSIM 是 **纯数据** 服务,因此不包含基于蜂窝网络的语音通话与短信功能。\n\n" +
      "您依然可以通过基于互联网的应用进行通话与消息收发:\n\n" +
      "- **语音通话**:WhatsApp、FaceTime、Skype 或任意 VoIP 应用。\n" +
      "- **消息**:WhatsApp、iMessage(通过数据)、Telegram、微信等。\n\n" +
      "出行小建议:保留本国 SIM 卡(双卡使用),以便继续接听本国号码来电及接收验证码;EvairSIM 则负责您所有的数据需求。",
    response_es:
      "EvairSIM es un servicio **solo de datos**, por lo que no incluye llamadas de voz ni SMS a través de la red celular.\n\n" +
      "Puede realizar llamadas y enviar mensajes mediante aplicaciones basadas en Internet:\n\n" +
      "- **Llamadas de voz**: WhatsApp, FaceTime, Skype o cualquier aplicación VoIP.\n" +
      "- **Mensajería**: WhatsApp, iMessage (por datos), Telegram, WeChat y similares.\n\n" +
      "Un consejo práctico para viajeros: conserve su SIM local junto a EvairSIM (dual SIM). Su número habitual podrá seguir recibiendo llamadas y códigos de verificación, mientras EvairSIM se encarga de los datos.",
  },
  {
    keywords: ['notification', 'notifications', 'push', 'alert', 'alerts', 'marketing email', 'unsubscribe', 'email alert', 'data alert', 'expiry alert', 'opt out', 'opt in'],
    keywords_zh: ['推送', '通知', '提醒', '营销', '取消订阅', '邮件提醒', '流量提醒', '到期提醒'],
    keywords_es: ['notificación', 'notificaciones', 'push', 'alerta', 'alertas', 'marketing', 'darse de baja', 'recibir alertas'],
    response:
      "You are in full control of the notifications you receive from EvairSIM.\n\n" +
      "- **Transactional alerts** (order confirmations, delivery of your eSIM, data-usage and expiry reminders) are always enabled for your protection, so you never miss a critical update about your account.\n" +
      "- **Marketing messages** (new countries, promotions, travel tips) can be turned on or off at any time.\n\n" +
      "To adjust your preferences, please open **Profile > Notification Preferences** in the Evair app. If you would like to opt out of all optional marketing communications, I can also mark that on your account from my side — just let me know.",
    response_zh:
      "关于 EvairSIM 的通知,您可以完全自主管理。\n\n" +
      "- **交易类通知**(订单确认、eSIM 交付、流量用量与到期提醒等)始终保持开启,以确保您不会错过账户相关的重要信息。\n" +
      "- **营销类通知**(新增目的地、促销活动、出行资讯等)可随时开启或关闭。\n\n" +
      "如需调整偏好设置,请在 Evair 应用中打开 **个人中心 > 通知偏好**。如您希望关闭全部可选的营销通讯,也可直接告诉我,我会在后台为您设置。",
    response_es:
      "Tiene pleno control sobre las notificaciones que recibe de EvairSIM.\n\n" +
      "- **Alertas transaccionales** (confirmaciones de pedido, entrega del eSIM, avisos de consumo y vencimiento) permanecen siempre activas para que no se pierda información importante sobre su cuenta.\n" +
      "- **Mensajes de marketing** (nuevos destinos, promociones, consejos de viaje) pueden activarse o desactivarse en cualquier momento.\n\n" +
      "Para ajustar sus preferencias, abra **Perfil > Preferencias de notificaciones** en la aplicación Evair. Si desea darse de baja de todas las comunicaciones de marketing opcionales, indíquemelo y puedo aplicarlo desde mi lado.",
  },
  {
    keywords: ['unbind', 'remove sim', 'delete sim', 'remove from account', 'unlink sim', 'unbound'],
    keywords_zh: ['解绑', '移除SIM', '删除SIM', '解除绑定'],
    keywords_es: ['desvincular', 'quitar sim', 'eliminar sim de cuenta', 'desligar sim'],
    response:
      "Of course. To remove a SIM from your Evair account:\n\n" +
      "1. Open the **My eSIMs / SIMs** tab.\n" +
      "2. Tap the SIM you wish to remove.\n" +
      "3. Scroll to the bottom of the details page and tap **Unbind SIM**.\n" +
      "4. Confirm the action.\n\n" +
      "Please note that unbinding removes the SIM from your account but does not cancel or refund an active plan. If you also wish to request a refund, please share your order number and I will review eligibility with you.",
    response_zh:
      "好的。要从 Evair 账户中移除一张 SIM 卡,请按以下步骤操作:\n\n" +
      "1. 打开 **我的 SIM 卡** 标签。\n" +
      "2. 点击您希望移除的 SIM 卡。\n" +
      "3. 在详情页底部点击 **解除绑定**。\n" +
      "4. 确认操作即可。\n\n" +
      "请注意,解除绑定仅会将该 SIM 从账户中移除,并不会取消或退还已有的有效套餐。如您还希望申请退款,请提供订单号,我会协助您核对退款资格。",
    response_es:
      "Con gusto. Para eliminar una SIM de su cuenta Evair:\n\n" +
      "1. Abra la pestaña **Mis eSIMs / SIMs**.\n" +
      "2. Pulse la SIM que desea eliminar.\n" +
      "3. Desplácese hasta el final de la página de detalles y pulse **Desvincular SIM**.\n" +
      "4. Confirme la acción.\n\n" +
      "Tenga en cuenta que la desvinculación retira la SIM de su cuenta, pero no cancela ni reembolsa un plan activo. Si además desea solicitar un reembolso, comparta su número de pedido y revisaré la elegibilidad con usted.",
  },
];

const GREETING_PATTERNS = /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|yo|greetings|hola|你好|您好|嗨)\b/i;
const THANKS_PATTERNS = /^(thanks|thank you|thx|ty|appreciate|cheers|gracias|谢谢|感谢|多谢)\b/i;

const GREETING_RESPONSES: Record<DetectedLang, string> = {
  en:
    "Hello, and welcome to EvairSIM support. I am the Evair virtual assistant and I would be happy to help. I can assist with:\n\n" +
    "- eSIM and physical SIM activation.\n" +
    "- Evair eCard setup.\n" +
    "- Data plans, top-ups and pricing.\n" +
    "- Coverage across more than 190 countries.\n" +
    "- Troubleshooting connectivity issues.\n" +
    "- Billing, refunds and payments.\n" +
    "- Shipping and delivery.\n\n" +
    "Please let me know how I can help today.",
  zh:
    "您好,欢迎联系 EvairSIM 客户服务。我是 Evair 智能助理,很乐意为您提供帮助。我可以协助处理以下事项:\n\n" +
    "- eSIM 与实体 SIM 卡激活。\n" +
    "- Evair eCard 设置。\n" +
    "- 流量套餐、充值与价格。\n" +
    "- 覆盖 190 多个国家和地区。\n" +
    "- 网络连接问题排查。\n" +
    "- 账单、退款与付款。\n" +
    "- 配送与物流。\n\n" +
    "请告诉我今日能为您做些什么。",
  es:
    "Hola, bienvenido al soporte de EvairSIM. Soy el asistente virtual de Evair y con gusto le atenderé. Puedo ayudarle con:\n\n" +
    "- Activación de eSIM y SIM física.\n" +
    "- Configuración de Evair eCard.\n" +
    "- Planes de datos, recargas y precios.\n" +
    "- Cobertura en más de 190 países.\n" +
    "- Solución de problemas de conectividad.\n" +
    "- Facturación, reembolsos y pagos.\n" +
    "- Envíos y entregas.\n\n" +
    "Por favor, indíqueme en qué puedo ayudarle hoy.",
};

const THANKS_RESPONSES: Record<DetectedLang, string> = {
  en: "You are very welcome. Please let me know if there is anything else I can help you with regarding your EvairSIM.",
  zh: "不客气。如您在使用 EvairSIM 的过程中还有其他需要协助的地方,请随时告诉我。",
  es: "Con mucho gusto. Si puedo ayudarle en algo más relacionado con su EvairSIM, no dude en decírmelo.",
};

const FALLBACK_RESPONSES: Record<DetectedLang, string> = {
  en:
    "Thank you for your message. I would like to make sure I give you the most accurate answer, so please help me with a little more context. I can assist with the following topics:\n\n" +
    "- eSIM and SIM activation and setup.\n" +
    "- Evair eCard (setup, specifications and troubleshooting).\n" +
    "- Data plans and top-ups.\n" +
    "- Coverage and network information.\n" +
    "- Connectivity troubleshooting.\n" +
    "- Billing and payments.\n" +
    "- Shipping of physical SIMs.\n" +
    "- Account management and notification preferences.\n\n" +
    "Could you please rephrase your question or pick one of the topics above? If you would prefer, I can also connect you with a member of our support team.",
  zh:
    "感谢您的留言。为确保能够给您最准确的回复,请您稍作补充。我可以协助以下主题:\n\n" +
    "- eSIM 与 SIM 卡激活及设置。\n" +
    "- Evair eCard(设置、规格与故障排查)。\n" +
    "- 流量套餐与充值。\n" +
    "- 覆盖范围与网络信息。\n" +
    "- 网络连接故障排查。\n" +
    "- 账单与付款。\n" +
    "- 实体 SIM 卡配送。\n" +
    "- 账户管理与通知偏好。\n\n" +
    "请重新描述您的问题,或从以上主题中选择一项;如您愿意,我也可以为您转接到客服团队的同事。",
  es:
    "Gracias por su mensaje. Para ofrecerle la respuesta más precisa, le agradecería un poco más de contexto. Puedo ayudarle con los siguientes temas:\n\n" +
    "- Activación y configuración de eSIM y SIM.\n" +
    "- Evair eCard (configuración, especificaciones y resolución de problemas).\n" +
    "- Planes de datos y recargas.\n" +
    "- Cobertura e información de red.\n" +
    "- Resolución de problemas de conectividad.\n" +
    "- Facturación y pagos.\n" +
    "- Envío de SIM físicas.\n" +
    "- Gestión de cuenta y preferencias de notificación.\n\n" +
    "¿Podría reformular su consulta o elegir uno de los temas anteriores? Si lo prefiere, también puedo ponerle en contacto con un miembro de nuestro equipo de soporte.",
};

const SHORT_INPUT_RESPONSES: Record<DetectedLang, string> = {
  en: "Could you please provide a little more detail so that I can help you accurately? I am here to assist with anything relating to your EvairSIM, including activation, data plans, troubleshooting and billing.",
  zh: "为便于准确回复,请您稍作补充。我可以协助您处理 EvairSIM 相关的任何问题,包括激活、流量套餐、故障排查与账单等。",
  es: "¿Podría facilitarme un poco más de información para poder ayudarle con precisión? Estoy a su disposición para cualquier consulta relacionada con su EvairSIM, incluyendo activación, planes de datos, resolución de problemas y facturación.",
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

/**
 * Canned replies offered to human agents in the CS dashboard. Tone mirrors
 * the customer-facing assistant: warm, professional, never flippant, never
 * emoji-laden.
 */
export function getAgentSuggestions(customerMessages: string[]): AgentSuggestion[] {
  const lastMsg = customerMessages[customerMessages.length - 1] || '';
  const allText = customerMessages.join(' ');
  const normalized = normalizeText(allText);
  const suggestions: AgentSuggestion[] = [];

  const hasOrderInfo = /\b(ord|order|ORD)[- ]?\d+/i.test(allText) || /订单号/.test(allText);
  const hasIccid = /\b\d{19,20}\b/.test(allText);
  void lastMsg;

  if (/refund|退款|退钱|reembolso|money back/i.test(normalized)) {
    if (hasOrderInfo) {
      suggestions.push({ text: "Thank you. I have located your order and am reviewing the refund eligibility now. Please allow me a moment.", category: 'resolve' });
      suggestions.push({ text: "Good news — your eSIM has not yet been activated, so you qualify for a full refund. I am processing it now, and the amount should appear on your card within 3 to 5 business days.", category: 'refund' });
      suggestions.push({ text: "I can see that the eSIM has already been activated and data has been consumed, so a full refund is unfortunately not possible. I would be glad to offer you a credit toward your next purchase as a goodwill gesture. Would that be acceptable?", category: 'refund' });
    } else {
      suggestions.push({ text: "Of course, I would be happy to assist with your refund request. Could you please share your order number or the email address used at checkout?", category: 'ask_info' });
      suggestions.push({ text: "Certainly, I can look into this for you. Could you kindly provide the order number along with the reason for the refund request?", category: 'ask_info' });
    }
    suggestions.push({ text: "Your refund has been processed successfully. The amount should be visible on your original payment method within 3 to 5 business days. Please let me know if there is anything else I can help with.", category: 'refund' });
  }

  if (/activ|激活|开卡|开通|bind|绑定|setup|设置/i.test(normalized)) {
    if (!hasIccid) {
      suggestions.push({ text: "Could you please share the ICCID printed on your SIM card? It is the 19 to 20 digit number just below the barcode.", category: 'ask_info' });
    }
    suggestions.push({ text: "I have checked your SIM on our side and it is activated and ready for use. Please insert the card, ensure data roaming is enabled, then restart the device.", category: 'resolve' });
    suggestions.push({ text: "I can see an issue with the activation on our side. I am escalating this to the technical team so it can be resolved as quickly as possible, typically within 24 hours.", category: 'escalate' });
  }

  if (/not working|no signal|no internet|没网|没信号|不能用|no funciona|sin señal/i.test(normalized)) {
    suggestions.push({ text: "I am sorry to hear this. May I ask you to try the following three steps, and then let me know the outcome?\n\n1. Toggle airplane mode off and on.\n2. Confirm that data roaming is enabled.\n3. Restart the device.", category: 'technical' });
    suggestions.push({ text: "Could you please tell me the model of your device and the country you are connecting from? That information will help me investigate more accurately.", category: 'ask_info' });
    suggestions.push({ text: "I have reviewed the network status on our side and everything appears normal. Please try selecting a carrier manually: open **Settings > Carrier**, disable automatic selection, then pick one of the listed networks.", category: 'technical' });
    suggestions.push({ text: "I am escalating this to our network operations team for a deeper review. We will follow up with you within a few hours.", category: 'escalate' });
  }

  if (/top.?up|recharge|充值|续费|加流量|more data|datos|recargar/i.test(normalized)) {
    suggestions.push({ text: "You can top up directly from the app. Go to **My SIMs**, tap your active SIM, then select **Add Data** to view the compatible packages.", category: 'resolve' });
    suggestions.push({ text: "I can see your current plan. Which size of data package are you considering? We offer options ranging from 1 GB up to 10 GB and beyond.", category: 'ask_info' });
    suggestions.push({ text: "I would like to share one note: your current plan is non-reloadable, so top-ups are not available on this specific product. A new plan would need to be purchased once the current allowance is used up. Would you like me to suggest a few suitable options?", category: 'resolve' });
  }

  if (/charge|payment|bill|账单|付款|扣费|cobro|pago|double/i.test(normalized)) {
    suggestions.push({ text: "I can see the charge on our side. Could you please confirm the exact date and amount of the transaction you have a question about?", category: 'ask_info' });
    suggestions.push({ text: "I have verified the charge on our end. It appears to be a pending authorization, which is typically released by the card issuer within 3 to 7 days. If it has not dropped off by then, please let us know and we will investigate further.", category: 'resolve' });
    suggestions.push({ text: "I can confirm that this was a duplicate charge, and we do apologise for the inconvenience. I have initiated the refund — you should see it on your card within 3 to 5 business days.", category: 'refund' });
  }

  if (/ship|deliver|快递|发货|配送|tracking|物流|envío/i.test(normalized)) {
    suggestions.push({ text: "Could you please share your order number? I will look up the tracking information for you straight away.", category: 'ask_info' });
    suggestions.push({ text: "I have found your order. Amazon is handling the delivery and a tracking email should be on its way to you shortly. Estimated delivery is 3 to 5 business days within the United States.", category: 'resolve' });
    suggestions.push({ text: "I can see that the order has not yet shipped. I am contacting our fulfilment team to prioritise it, and you should receive a shipping notification within 24 hours.", category: 'escalate' });
  }

  if (/install|安装|qr|二维码|scan|扫描|delete|删除|recover|恢复/i.test(normalized)) {
    suggestions.push({ text: "A quick reminder that eSIM profiles can only be installed once. If the profile has already been removed from the device, it cannot be recovered, and a new plan would need to be purchased.", category: 'technical' });
    suggestions.push({ text: "To install your eSIM, please open the app, go to **My eSIMs**, tap your card, then select **Install**. A QR code will appear — scan it from **Settings > Cellular > Add eSIM** on your phone.", category: 'resolve' });
    suggestions.push({ text: "I completely understand, and I am sorry this happened. Since eSIM profiles can only be installed once, I will arrange a replacement for you. Allow me a moment to process this.", category: 'refund' });
  }

  if (/human|agent|real person|人工|客服|真人|转接|humano|agente/i.test(normalized)) {
    suggestions.push({ text: "Hello, this is a member of the support team and I am happy to help. Please describe the issue in as much detail as possible so that I can assist you effectively.", category: 'greeting' });
  }

  if (suggestions.length === 0) {
    suggestions.push(
      { text: "Hello, thank you for reaching out. I am looking into your query now. Could you please share a little more detail so that I can assist you more quickly?", category: 'greeting' },
      { text: "Could you kindly share your order number or ICCID so that I can locate your account?", category: 'ask_info' },
      { text: "The issue has been resolved on our side. Please restart your device and let me know whether the service is working as expected.", category: 'resolve' },
      { text: "I am escalating this to our specialist team for a deeper review. You can expect an update within 24 hours.", category: 'escalate' },
    );
  }

  suggestions.push({ text: "Is there anything else I can help you with today? Thank you for choosing EvairSIM.", category: 'resolve' });

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

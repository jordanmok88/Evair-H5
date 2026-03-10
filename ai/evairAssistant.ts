interface KnowledgeEntry {
  keywords: string[];
  response: string;
  followUp?: string;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // --- SIM ACTIVATION ---
  {
    keywords: ['activate', 'activation', 'how to activate', 'start', 'turn on', 'enable'],
    response:
      "To activate your EvairSIM:\n\n" +
      "📱 **eSIM**: After purchase, go to Settings > Cellular > Add eSIM, then scan the QR code we provided via email.\n\n" +
      "💳 **Physical SIM**: Insert the card into your device, then open the Evair app and enter your ICCID number to bind and activate it.\n\n" +
      "Activation is usually instant for eSIMs and takes up to 5 minutes for physical SIMs.",
    followUp: "Would you like step-by-step instructions for your specific device?",
  },
  // --- ICCID / EID ---
  {
    keywords: ['iccid', 'eid', 'number', 'where is iccid', 'find iccid', 'card number', 'serial', 'barcode'],
    response:
      "Your ICCID (Integrated Circuit Card Identifier) is a unique 19-20 digit number printed on your physical SIM card. You can find it:\n\n" +
      "1️⃣ **On the SIM card** — printed below the barcode\n" +
      "2️⃣ **On the card holder** — next to the punch-out area\n" +
      "3️⃣ **In your device** — Settings > About Phone > SIM Status\n\n" +
      "For eSIMs, the EID is shown in Settings > General > About on iOS.",
  },
  // --- ESIM INSTALLATION ---
  {
    keywords: ['install esim', 'setup esim', 'qr code', 'scan', 'add esim', 'esim setup', 'how to install'],
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
  },
  // --- DEVICE COMPATIBILITY ---
  {
    keywords: ['compatible', 'compatibility', 'support', 'supported', 'work with', 'which phone', 'device', 'iphone', 'android', 'samsung', 'pixel', 'does my phone'],
    response:
      "EvairSIM eSIM is compatible with most modern smartphones:\n\n" +
      "✅ **iPhone**: XS, XR, 11, 12, 13, 14, 15, 16 and newer\n" +
      "✅ **Samsung**: Galaxy S20+ and newer, Galaxy Z series\n" +
      "✅ **Google Pixel**: Pixel 3a and newer\n" +
      "✅ **iPad**: Pro (3rd gen+), Air (3rd gen+), Mini (5th gen+)\n\n" +
      "⚠️ Your device must be **carrier-unlocked** to use EvairSIM.\n\n" +
      "Physical SIM cards work with any unlocked device that accepts nano-SIM.",
  },
  // --- DATA / TOP UP ---
  {
    keywords: ['data', 'top up', 'topup', 'recharge', 'more data', 'add data', 'ran out', 'gb', 'usage', 'how much data', 'data left', 'remaining'],
    response:
      "You can check and manage your data in the Evair app:\n\n" +
      "📊 **Check remaining data**: Go to My eSIMs/SIMs tab — the ring gauge shows your usage.\n\n" +
      "➕ **Top up**: Tap \"Add Data\" on your active SIM to purchase additional data packages starting from $3.00 for 1GB.\n\n" +
      "Data packages are available in various sizes and can be added at any time, even before your current plan expires.",
  },
  // --- PRICING / PLANS ---
  {
    keywords: ['price', 'pricing', 'cost', 'how much', 'plan', 'plans', 'cheap', 'expensive', 'discount', 'offer', 'promotion', '50%', 'first order'],
    response:
      "EvairSIM offers competitive pricing with coverage in 190+ countries:\n\n" +
      "🎉 **New customer?** Get 50% OFF your first order!\n\n" +
      "Sample plans (prices vary by country):\n" +
      "• 1 GB / 7 days — from $2.25\n" +
      "• 3 GB / 15 days — from $4.50\n" +
      "• 5 GB / 30 days — from $7.50\n" +
      "• 10 GB / 30 days — from $12.50\n\n" +
      "All plans include hotspot sharing and 5G where available.",
  },
  // --- NETWORK / COVERAGE ---
  {
    keywords: ['network', 'coverage', 'country', 'countries', 'roaming', 'signal', '5g', '4g', 'lte', 'speed', 'slow'],
    response:
      "EvairSIM covers 190+ countries and regions worldwide:\n\n" +
      "🌍 We partner with top local carriers in each country to ensure the best coverage.\n\n" +
      "• **Speed**: 4G LTE / 5G (where available)\n" +
      "• **Hotspot**: Supported on all plans\n" +
      "• **Roaming**: Seamless — no extra charges\n\n" +
      "You can browse all supported countries and their network partners in the Shop tab.",
  },
  // --- NOT WORKING / TROUBLESHOOTING ---
  {
    keywords: ['not working', 'doesnt work', "doesn't work", 'problem', 'issue', 'error', 'fail', 'failed', 'help', 'trouble', 'no service', 'no signal', 'no internet', 'cant connect', "can't connect", 'fix'],
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
  },
  // --- BILLING / PAYMENT ---
  {
    keywords: ['bill', 'billing', 'payment', 'pay', 'charge', 'charged', 'refund', 'receipt', 'invoice', 'credit card', 'transaction'],
    response:
      "Regarding billing and payments:\n\n" +
      "💳 **Payment methods**: We accept all major credit/debit cards and Apple Pay.\n\n" +
      "🧾 **Receipts**: Sent automatically to your email after purchase. You can also view orders in Profile > Orders.\n\n" +
      "🔄 **Refunds**: If your eSIM hasn't been activated, you're eligible for a full refund within 30 days. Contact us with your order details.\n\n" +
      "If you see an unexpected charge, please share the transaction date and amount so I can look into it.",
  },
  // --- SHIPPING ---
  {
    keywords: ['ship', 'shipping', 'delivery', 'deliver', 'arrive', 'tracking', 'physical', 'mail', 'how long'],
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
  },
  // --- EXPIRY ---
  {
    keywords: ['expire', 'expiry', 'expiration', 'validity', 'valid', 'how long last', 'duration', 'renew', 'extend'],
    response:
      "Your data plan validity starts when you first connect to a network in your destination country, not when you purchase it.\n\n" +
      "⏱️ **Plan duration**: Ranges from 7 to 30 days depending on your plan.\n\n" +
      "📅 **Check expiry**: Open My SIMs tab — the expiry date is shown on your SIM card details.\n\n" +
      "You can purchase a new plan or top up before your current one expires to keep your connection active.",
  },
  // --- HOTSPOT / TETHERING ---
  {
    keywords: ['hotspot', 'tether', 'tethering', 'share', 'wifi', 'share data', 'personal hotspot'],
    response:
      "Yes! All EvairSIM plans support hotspot/tethering at no extra cost. 🎉\n\n" +
      "To enable it:\n" +
      "• **iPhone**: Settings > Personal Hotspot > Allow Others to Join\n" +
      "• **Android**: Settings > Hotspot & Tethering > Wi-Fi Hotspot\n\n" +
      "Make sure EvairSIM is selected as your data line if you have multiple SIMs.",
  },
  // --- ACCOUNT ---
  {
    keywords: ['account', 'profile', 'login', 'log in', 'sign in', 'password', 'email', 'change email', 'change password', 'forgot password', 'delete account'],
    response:
      "For account-related actions:\n\n" +
      "👤 **View/Edit profile**: Profile tab > Account Information\n" +
      "🔒 **Change password**: Profile tab > Account Information > Edit (under password)\n" +
      "📧 **Change email**: Contact our support team — email changes require verification.\n" +
      "🔑 **Forgot password**: Tap \"Forgot Password\" on the login screen and we'll send a reset link.\n" +
      "🗑️ **Delete account**: Profile tab > Account Information > Delete Account (at the bottom).",
  },
  // --- MULTIPLE SIMS ---
  {
    keywords: ['multiple', 'dual sim', 'two sim', 'switch', 'more than one', 'several', 'another sim'],
    response:
      "Yes, you can use multiple EvairSIM plans simultaneously!\n\n" +
      "📱 **Dual SIM devices**: Keep your primary SIM for calls and use EvairSIM for data.\n\n" +
      "✈️ **Multiple destinations**: Purchase separate plans for each country, or choose a regional/global plan.\n\n" +
      "All your SIMs are managed in the My eSIMs/SIMs tab where you can switch between them easily.",
  },
  // --- GENERAL / ABOUT ---
  {
    keywords: ['what is evair', 'about evair', 'who are you', 'tell me about', 'evairsim', 'evair sim'],
    response:
      "EvairSIM provides affordable mobile data for travelers worldwide! 🌍\n\n" +
      "🔹 **190+ countries** covered\n" +
      "🔹 **eSIM & Physical SIM** options\n" +
      "🔹 **Instant activation** for eSIMs\n" +
      "🔹 **50% off** your first order\n" +
      "🔹 **5G/4G LTE** speeds with hotspot\n" +
      "🔹 **No roaming fees** — pay once, use anywhere\n\n" +
      "Browse plans in the Shop tab or ask me anything specific!",
  },
  // --- CANCEL ---
  {
    keywords: ['cancel', 'cancellation', 'cancel order', 'cancel plan', 'stop'],
    response:
      "Regarding cancellations:\n\n" +
      "• **eSIM not yet activated**: You can request a full refund — just share your order number.\n" +
      "• **eSIM already activated**: Unfortunately, activated eSIMs cannot be cancelled, but unused data can sometimes be credited toward a new plan.\n" +
      "• **Physical SIM in transit**: Can be cancelled before shipment for a full refund.\n\n" +
      "Would you like me to help you with a specific cancellation?",
  },
  // --- CONTACT HUMAN ---
  {
    keywords: ['human', 'agent', 'real person', 'speak to someone', 'talk to person', 'live chat', 'representative', 'operator', 'transfer'],
    response:
      "I understand you'd like to speak with a human agent. 🙋‍♂️\n\n" +
      "I've flagged your conversation for our support team. A live agent will join this chat shortly — our typical response time is within 2 hours during business hours.\n\n" +
      "In the meantime, feel free to describe your issue in detail so the agent can assist you faster when they connect!",
  },
  // --- ECARD: WHAT IS IT ---
  {
    keywords: ['ecard', 'e-card', 'evair ecard', 'what is ecard', 'physical esim', 'esim card', 'esim chip'],
    response:
      "**Evair eCard** is a physical SIM card with an embedded eSIM chip — it brings eSIM technology to any phone, even those without built-in eSIM support.\n\n" +
      "🔹 Simply insert the eCard like a regular SIM card\n" +
      "🔹 Download up to **15–20 eSIM profiles** onto a single card (1.5MB capacity)\n" +
      "🔹 Switch between profiles anytime — travel data, local plans, and more\n" +
      "🔹 Works on both **Android** and **iPhone**\n\n" +
      "It's GSMA certified, follows the **SGP.22 V2.5** RSP standard, and supports **5G** networks with MEP compatibility.",
    followUp: "Would you like to know how to set up an eCard, or how it works on iPhone vs Android?",
  },
  // --- ECARD: SETUP / HOW TO USE ---
  {
    keywords: ['ecard setup', 'setup ecard', 'how to use ecard', 'ecard how', 'ecard start', 'ecard begin', 'bind ecard', 'bind card'],
    response:
      "Setting up your Evair eCard is easy:\n\n" +
      "1️⃣ **Insert** the eCard into your phone's SIM slot (just like a regular SIM)\n" +
      "2️⃣ **Find the EID** — it's a unique number printed on the back of the card\n" +
      "3️⃣ **Open the eCard tab** in the Evair app and tap \"Bind Card\"\n" +
      "4️⃣ **Enter the EID** and tap Bind — your card is now linked to your account\n" +
      "5️⃣ **Download eSIM profiles** — browse the eSIM shop and pick a country plan\n\n" +
      "Once downloaded, the profile is stored directly on your eCard and ready to use!",
    followUp: "Would you like specific instructions for iPhone or Android?",
  },
  // --- ECARD: ANDROID SETUP ---
  {
    keywords: ['ecard android', 'android ecard', 'ecard google play', 'ecard download android'],
    response:
      "**Evair eCard on Android** — direct profile download:\n\n" +
      "1️⃣ Insert the Evair eCard into your Android phone\n" +
      "2️⃣ Open the Evair app (download from Google Play if needed)\n" +
      "3️⃣ Go to the **eCard tab** and bind your card using the EID\n" +
      "4️⃣ Browse eSIM plans and tap **Download** to install a profile directly\n\n" +
      "✅ Android phones can download profiles directly through the app using the **LPA/IPA SDK** — it supports OMA and Google API for plug-and-play operation.\n\n" +
      "The eCard supports Android, Linux, and RT OS devices.",
  },
  // --- ECARD: IPHONE / IOS SETUP ---
  {
    keywords: ['ecard iphone', 'ecard ios', 'ecard ipad', 'ecard apple', 'ecard stk', 'sim toolkit', 'sim applications'],
    response:
      "**Evair eCard on iPhone** — via SIM Toolkit (STK):\n\n" +
      "⚠️ iPhones cannot download eSIM profiles directly through the app. Instead, use the built-in SIM Toolkit:\n\n" +
      "1️⃣ Insert the Evair eCard into your iPhone\n" +
      "2️⃣ Go to **Settings > Cellular**\n" +
      "3️⃣ Tap your **Evair SIM card** plan\n" +
      "4️⃣ Find and tap **\"SIM Applications\"**\n" +
      "5️⃣ Use the **Evair STK menu** to browse and manage eSIM profiles\n\n" +
      "The STK method works because the eCard communicates with the carrier's SM-DP+ server through the SIM Toolkit interface, bypassing Apple's eSIM restrictions.",
  },
  // --- ECARD: SPECS & SECURITY ---
  {
    keywords: ['ecard spec', 'ecard security', 'ecard certified', 'ecard standard', 'ecard capacity', 'ecard storage', 'how many profiles', 'eal4', 'sgp.22', 'gsma', 'java card'],
    response:
      "**Evair eCard Technical Specifications:**\n\n" +
      "📋 **Standards**: SGP.22 V2.5 (RSP), SGP.02 V3.2 (M2M), SGP.32 V1.2 (IoT)\n" +
      "💾 **Capacity**: 1.5MB — stores **15 to 20 profiles**\n" +
      "   (500KB variant: 5–10 profiles, 150KB variant: 2–3 profiles)\n" +
      "📶 **Network**: Supports **5G** and MEP (Multiple Enabled Profiles)\n\n" +
      "🔒 **Security**:\n" +
      "   • **EAL4+** security level COS platform\n" +
      "   • RSA / ECC / AES / SHA algorithms\n" +
      "   • SM1 / SM2 / SM3 / SM4 algorithms\n" +
      "   • FLASH management dual patent technology\n\n" +
      "✅ **Certifications**: GSMA internationally certified, complies with Java Card, GlobalPlatform (GP), ETSI, and 3GPP standards.\n\n" +
      "📱 **Product Grades**: Consumer, Industrial, Automotive",
  },
  // --- ECARD: PROFILE MANAGEMENT ---
  {
    keywords: ['ecard profile', 'ecard manage', 'switch profile', 'ecard switch', 'ecard profiles', 'download profile', 'delete profile', 'ecard data'],
    response:
      "**Managing eSIM profiles on your Evair eCard:**\n\n" +
      "📥 **Download**: Go to the eCard tab > Profiles > \"Download New Profile\" or \"Buy New eSIM\" to browse plans by country.\n\n" +
      "🔄 **Switch**: You can have multiple profiles stored but only one active at a time. Switch between them in the Profiles tab or via STK on iPhone.\n\n" +
      "📊 **Check usage**: Each profile shows data used, data remaining, and days left.\n\n" +
      "💡 The eCard connects to the **SM-DP+** (Subscription Manager - Data Preparation) server to securely download and activate profiles over the air.",
    followUp: "Would you like help purchasing a new eSIM plan for your eCard?",
  },
  // --- ECARD: EID ---
  {
    keywords: ['ecard eid', 'where is eid', 'find eid', 'eid number ecard', 'back of card', 'ecard number'],
    response:
      "The **EID** (eUICC Identifier) is a unique number that identifies your Evair eCard:\n\n" +
      "📍 **Where to find it**: The EID is printed on the **back of your Evair eCard**, typically as a long numeric string (32 digits).\n\n" +
      "🔗 **What it's for**: You need it to bind the card to your Evair account. Once bound, you can download and manage eSIM profiles remotely.\n\n" +
      "To bind: Go to the **eCard tab** > enter the EID > tap **Bind Card**.",
  },
  // --- ECARD: VS ESIM ---
  {
    keywords: ['ecard vs esim', 'difference ecard', 'ecard or esim', 'why ecard', 'ecard benefit', 'ecard advantage', 'no esim phone', 'phone no esim'],
    response:
      "**Evair eCard vs Regular eSIM — when to use which:**\n\n" +
      "📱 **Regular eSIM** — best if your phone has built-in eSIM support:\n" +
      "   • Instant digital activation via QR code\n" +
      "   • No physical card needed\n" +
      "   • Works on iPhone XS+, Samsung S20+, Pixel 3a+, etc.\n\n" +
      "💳 **Evair eCard** — ideal for phones WITHOUT eSIM support:\n" +
      "   • Brings eSIM to any phone with a SIM slot\n" +
      "   • Store 15–20 profiles on one physical card\n" +
      "   • Move between devices — just swap the card\n" +
      "   • Great for older or budget Android phones\n" +
      "   • Also works on iPhones (via STK method)\n\n" +
      "💡 **Pro tip**: Even if your phone supports eSIM, the eCard gives you extra profile storage beyond your device's built-in limit.",
  },
  // --- ECARD: COMPATIBILITY ---
  {
    keywords: ['ecard compatible', 'ecard work with', 'ecard any phone', 'ecard which phone', 'ecard device'],
    response:
      "**Evair eCard works with virtually any phone** that has a SIM card slot:\n\n" +
      "✅ **Android phones** — full support with direct profile download via app\n" +
      "   (Supports LPA/IPA SDK, OMA and Google API)\n" +
      "✅ **iPhones** — supported via SIM Toolkit (STK) method\n" +
      "✅ **Feature phones** — basic STK support for profile management\n" +
      "✅ **IoT devices** — compatible with Linux and RT OS\n\n" +
      "📐 **Form factors**: Available as nano-SIM (standard plug-in) and other sizes.\n\n" +
      "The card is consumer-grade certified and also available in industrial and automotive grades for specialized use.",
  },
  // --- ECARD: PLATFORM / SM-DP+ ---
  {
    keywords: ['sm-dp', 'smdp', 'rsp', 'ota', 'over the air', 'ecard platform', 'ecard server', 'remote provisioning', 'eim'],
    response:
      "**Evair eCard Platform Architecture:**\n\n" +
      "The Evair eCard system is built on the GSMA Remote SIM Provisioning (RSP) framework:\n\n" +
      "🖥️ **SM-DP+ Server** (Subscription Manager - Data Preparation+):\n" +
      "   • Follows GSMA SGP.22 standard\n" +
      "   • Manages full eSIM lifecycle — from production to activation\n" +
      "   • Supports domestic operator certificates and GSMA CI certificate chains\n\n" +
      "🔗 **LPA/IPA** (Local Profile Assistant / Integrated Profile Assistant):\n" +
      "   • Complies with GSMA standard\n" +
      "   • SDK integration for Android, Linux, RT OS\n" +
      "   • Supports OMA and Google API — plug and play\n\n" +
      "📡 **IoT/eIM Platform**: GSMA SGP.32 standard for IoT device connection management, supporting multi-operator and multi-tenant configurations.",
  },
  // --- ECARD: TROUBLESHOOTING ---
  {
    keywords: ['ecard not working', 'ecard problem', 'ecard issue', 'ecard error', 'ecard fail', 'cant bind', "can't bind", 'ecard no service', 'stk not showing', 'sim applications missing'],
    response:
      "Let's troubleshoot your Evair eCard:\n\n" +
      "**Card not recognized:**\n" +
      "1️⃣ Remove and re-insert the eCard — ensure it's seated properly\n" +
      "2️⃣ Restart your device\n" +
      "3️⃣ Try in another device to rule out a slot issue\n\n" +
      "**Can't bind the card:**\n" +
      "1️⃣ Double-check the EID — it's printed on the back of the card\n" +
      "2️⃣ Make sure you're connected to the internet\n" +
      "3️⃣ The EID must be at least 10 characters\n\n" +
      "**iPhone — \"SIM Applications\" not showing:**\n" +
      "1️⃣ Go to Settings > Cellular > select the Evair SIM plan\n" +
      "2️⃣ Look for \"SIM Applications\" or \"SIM Toolkit\" — it may take a moment to appear\n" +
      "3️⃣ Restart the phone and try again\n\n" +
      "**Profile download fails (Android):**\n" +
      "1️⃣ Ensure you have a stable internet connection\n" +
      "2️⃣ Check that your eCard has available profile slots\n" +
      "3️⃣ Restart the app and try again\n\n" +
      "If none of these work, please share your device model and I'll help further!",
  },
];

const GREETING_PATTERNS = /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|yo|greetings|hola|你好)\b/i;
const THANKS_PATTERNS = /^(thanks|thank you|thx|ty|appreciate|cheers|gracias|谢谢)\b/i;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
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
    }
  }
  return score;
}

export function getAIResponse(userMessage: string): string {
  const trimmed = userMessage.trim();

  if (GREETING_PATTERNS.test(trimmed)) {
    return "Hello! 👋 I'm Evair's AI assistant. I can help you with SIM activation, eSIM setup, Evair eCard, data plans, troubleshooting, billing, and more. What would you like to know?";
  }

  if (THANKS_PATTERNS.test(trimmed)) {
    return "You're welcome! 😊 Is there anything else I can help you with regarding your EvairSIM?";
  }

  const normalized = normalizeText(trimmed);

  if (normalized.length < 2) {
    return "Could you provide a bit more detail? I'm here to help with anything related to your EvairSIM — activation, data plans, troubleshooting, billing, and more!";
  }

  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    const score = scoreMatch(normalized, entry.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore >= 2) {
    let response = bestMatch.response;
    if (bestMatch.followUp) {
      response += `\n\n${bestMatch.followUp}`;
    }
    return response;
  }

  return (
    "Thanks for your question! I want to make sure I give you the best answer. Here are some topics I can help with:\n\n" +
    "• 📱 eSIM/SIM activation & setup\n" +
    "• 💳 Evair eCard — setup, specs & troubleshooting\n" +
    "• 📊 Data plans & top-ups\n" +
    "• 🌍 Coverage & network info\n" +
    "• 🔧 Troubleshooting\n" +
    "• 💰 Billing & payments\n" +
    "• 📦 Shipping (Physical SIM)\n" +
    "• 👤 Account management\n\n" +
    "Could you rephrase your question or pick a topic? If you'd prefer, I can connect you with a live agent."
  );
}

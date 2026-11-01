// Blue Archive Student Companion Database
const STUDENTS_DATA = {
  shiroko: {
    id: "10010",
    name: "Sunaookami Shiroko",
    jpName: "砂狼シロコ",
    school: "Abydos High School",
    schoolId: "abydos",
    club: "Countermeasure Committee",
    role: "Pointman / Tactician",
    accentColor: "#00d2fe",
    haloColor: "#00ffff",
    portrait: "assets/characters/shiroko_portrait.webp",
    icon: "assets/characters/shiroko_icon.webp",
    badge: "SCHALE FIELD OPERATIVE",
    quotes: {
      home: "Sensei, are you ready to inspect the quality reports? Nn, let's make sure zero defects pass through.",
      projects: "These projects demonstrate solid technical precision and system control. Commencing mission review.",
      skills: "96% accuracy in OK/NG quality assessment... impressive. Your inspection speed is as sharp as ever, Sensei.",
      about: "Jamaludin-senpai is studying Informatics at Universitas Pelita Bangsa while working in industrial QC. A true multi-class operator.",
      contact: "Comm channels are active. You can send an encrypted transmission via Email, GitHub, or Discord."
    }
  },
  yuuka: {
    id: "13010",
    name: "Hayase Yuuka",
    jpName: "早瀬ユウカ",
    school: "Millennium Science School",
    schoolId: "millennium",
    club: "Seminar (Treasurer)",
    role: "Logistics & Calculation",
    accentColor: "#4d7cfe",
    haloColor: "#5b92e5",
    portrait: "assets/characters/yuuka_portrait.webp",
    icon: "assets/characters/yuuka_icon.webp",
    badge: "CALCULUS & AUDIT LEAD",
    quotes: {
      home: "Sensei! Have you checked the daily AQL inspection numbers yet? 5S and K3 compliance must always be 100%!",
      projects: "I've audited these software architecture files! The logic and code hygiene meet Millennium high standards.",
      skills: "Advanced Excel, QC defect categorization, and web development skills... your efficiency score is over 95%!",
      about: "Balancing university lectures in Computer Science and shift-based QC operations? Sensei, take proper care of your health too!",
      contact: "All contact frequencies are verified. Sensei, don't leave incoming dispatches unanswered, okay?"
    }
  },
  aris: {
    id: "10015",
    name: "Tendou Aris",
    jpName: "天童アリス",
    school: "Millennium Science School",
    schoolId: "millennium",
    club: "Game Development Department",
    role: "Hero / Heavy Blaster",
    accentColor: "#38bdf8",
    haloColor: "#38bdf8",
    portrait: "assets/characters/aris_portrait.webp",
    icon: "assets/characters/aris_icon.webp",
    badge: "LV.MAX BRAVE HERO",
    quotes: {
      home: "Pan-paka-pan! Aris has arrived! Sensei Jamaludin's epic portfolio quest is ready to explore!",
      projects: "A wild portfolio project appeared! Jamaludin used 'Clean Code' and 'Strict QC'! It's super effective!",
      skills: "Informatics stats: +90! Quality Control inspection power: +96! Sensei is definitely a legendary rank adventurer!",
      about: "Aris read Jamaludin's lore! A warrior from Bogor who conquers both tech code and factory inspection realms!",
      contact: "Transmission link established! Aris can send party invitations via Discord (hcfgjbtr) or GitHub!"
    }
  },
  hina: {
    id: "10004",
    name: "Sorasaki Hina",
    jpName: "空崎ヒナ",
    school: "Gehenna Academy",
    schoolId: "gehenna",
    club: "Prefect Team (Head)",
    role: "Commander / Quality Enforcer",
    accentColor: "#a855f7",
    haloColor: "#c084fc",
    portrait: "assets/characters/hina_portrait.webp",
    icon: "assets/characters/hina_icon.webp",
    badge: "PREFECT DISCIPLINE CHIEF",
    quotes: {
      home: "Zero defects. Zero tolerance for carelessness. Sensei, let's maintain strict discipline and safety today.",
      projects: "Every detail in this work reflects strict verification. No room for errors or substandard outputs.",
      skills: "Visual inspection, defect root-cause analysis, and systematic quarantine handling... this is true diligence.",
      about: "Dedication and real-world work experience speak louder than words. Jamaludin's record is thoroughly verified.",
      contact: "If someone requires a reliable professional for their organization, they should reach out immediately."
    }
  },
  mika: {
    id: "10059",
    name: "Misono Mika",
    jpName: "聖園ミカ",
    school: "Trinity General School",
    schoolId: "trinity",
    club: "Tea Party",
    role: "Attacker / Princess",
    accentColor: "#ff7ea5",
    haloColor: "#ffa8c5",
    portrait: "assets/characters/mika_portrait.webp",
    icon: "assets/characters/mika_icon.webp",
    badge: "TRINITY TEA PARTY ELITE",
    quotes: {
      home: "Sensei~☆ Welcome! Isn't Jamaludin's Blue Archive tactical portfolio super cool and sparkly?",
      projects: "Kyaa~! Look at all these projects! Both Quality Control tools and interactive web engineering!",
      skills: "Sensei is so talented! High precision inspection, modern web coding, and awesome teamwork!",
      about: "Student at Universitas Pelita Bangsa and QC specialist at PT. Pasifik! Isn't he so hardworking? ☆",
      contact: "Come on, don't be shy! Send an email or drop a message on Discord right now! Mika promises it'll be fun~!"
    }
  },
  hoshino: {
    id: "10012",
    name: "Takanashi Hoshino",
    jpName: "小鳥遊ホシノ",
    school: "Abydos High School",
    schoolId: "abydos",
    club: "Countermeasure Committee",
    role: "President / Shield Tank",
    accentColor: "#f59e0b",
    haloColor: "#fbbf24",
    portrait: "assets/characters/hoshino_portrait.webp",
    icon: "assets/characters/hoshino_icon.webp",
    badge: "ABYDOS VETERAN SHIELD",
    quotes: {
      home: "Uhee~ Uncle is getting sleepy watching the night shift, but Jamaludin's inspection speed keeps everyone safe.",
      projects: "Well done, well done. Building robust tools and maintaining production quality is no easy task.",
      skills: "5S, K3 safety compliance, and sharp inspection eyes... Uncle can rest easy knowing quality is in good hands.",
      about: "Studying Informatics while managing daily industrial targets? Hehe, young people sure have infinite stamina.",
      contact: "Feel free to drop a line anytime. Sensei's communication lines are always open."
    }
  }
};

// Fixed Character Companion Data for Each Specific Menu
const MENU_CHARACTERS = {
  home: {
    studentKey: 'shiroko',
    name: 'Sunaookami Shiroko',
    role: 'Abydos High School · Countermeasure Committee',
    voiceFile: 'assets/audio/voice_home_shiroko.mp3',
    voiceJp: '「ようこそ、先生。今日もよろしく。」',
    dialogue: 'Sensei, selamat datang di Dossier Taktikal Jamaludin. Nn, mari kita tinjau hasil operasi dan standar kontrol kualitas hari ini.',
    accentColor: '#00d2fe',
    haloColor: '#00ffff',
    portrait: 'assets/characters/shiroko_portrait.webp'
  },
  viewProjects: {
    studentKey: 'aris',
    name: 'Tendou Aris',
    role: 'Millennium Science School · Game Dev Dept',
    voiceFile: 'assets/audio/voice_projects_aris.mp3',
    voiceJp: '「パンパカパーン！レベルアップです！」',
    dialogue: 'Pan-paka-pan! Aris telah membuka artefak proyek Jamaludin! Seluruh kode aplikasi dan sistem QC beroperasi pada status 100%!',
    accentColor: '#38bdf8',
    haloColor: '#38bdf8',
    portrait: 'assets/characters/aris_portrait.webp'
  },
  viewSkills: {
    studentKey: 'yuuka',
    name: 'Hayase Yuuka',
    role: 'Millennium Science School · Seminar (Treasurer)',
    voiceFile: 'assets/audio/voice_skills_yuuka.mp3',
    voiceJp: '「ふふーん。やっぱり先生は賢いですね。」',
    dialogue: 'Fufun~ Nilai evaluasi Quality Control 96%, pemahaman 5S & K3, dan logika informatika terhitung sangat presisi. Jamaludin memang operator yang cerdas!',
    accentColor: '#4d7cfe',
    haloColor: '#5b92e5',
    portrait: 'assets/characters/yuuka_portrait.webp'
  },
  viewAbout: {
    studentKey: 'hina',
    name: 'Sorasaki Hina',
    role: 'Gehenna Academy · Prefect Team (Head)',
    voiceFile: 'assets/audio/voice_about_hina.mp3',
    voiceJp: '「ああ、待ってたよ。先生。」',
    dialogue: 'Aa, Sensei... Riwayat kerja di PT. Injeksi Plastik Pasifik dan perkuliahan S1 Teknik Informatika di Universitas Pelita Bangsa telah diverifikasi. Zero defect, zero negligence.',
    accentColor: '#a855f7',
    haloColor: '#c084fc',
    portrait: 'assets/characters/hina_portrait.webp'
  },
  viewContact: {
    studentKey: 'mika',
    name: 'Misono Mika',
    role: 'Trinity General School · Tea Party',
    voiceFile: 'assets/audio/voice_contact_mika.mp3',
    voiceJp: '「先生、おかえり！待ってたよ！」',
    dialogue: 'Sensei, okaeri! Jalur transmisi SCHALE sudah dibuka! Mau kirim pesan via Gmail, follow Instagram, atau invite Discord? Mika tunggu ya~',
    accentColor: '#ff7ea5',
    haloColor: '#ffa8c5',
    portrait: 'assets/characters/mika_portrait.webp'
  }
};

window.STUDENTS_DATA = STUDENTS_DATA;
window.MENU_CHARACTERS = MENU_CHARACTERS;

export type Lang = 'en' | 'hi';

const D = {
  en: {
    appName: 'Gram Yojana',
    tagline: "Come, let's draw up our village's plan together.",
    pickVillage: 'Pick your village',
    search: 'Search by village or panchayat…',
    continuePlan: 'Continue my plan',
    noPlanYet: 'No plan started yet. Pick a village below and lay the first road.',
    upload: 'Bring your own village',
    uploadHint: 'Upload a SVAMITVA / any GeoJSON file',
    open: 'Open village',
    back: 'Home',
    road: 'Road',
    drain: 'Drain',
    water: 'Water pipe',
    toilet: 'Toilet',
    light: 'Streetlight',
    measure: 'Measure',
    soon: 'Coming soon',
    undo: 'Undo',
    redo: 'Redo',
    tapStart: 'Tap the ground to put the road’s first point.',
    tapMore: 'Keep tapping to bend the road. Tap on an existing road to join it.',
    build: 'Build this road',
    clear: 'Clear',
    lastPoint: 'Last point',
    roadType: 'Road type',
    width: 'Width',
    thickness: 'Thickness',
    shoulder: 'Shoulder (each side)',
    length: 'Length',
    cost: 'Estimate',
    left: 'left',
    fundedBy: 'Paid from',
    emptyWorks: 'Nothing built yet. Your village is waiting.',
    measureHint: 'Tap two spots to measure the distance.',
    walls: 'Photo',
    breakdown: 'Where the money goes',
    tooShort: 'That road is too short to build. Add another point further away.',
    needTwo: 'Tap at least two points on the ground first.',
    oldRoad: 'Existing road',
    newRoad: 'Planned road',
  },
  hi: {
    appName: 'ग्राम योजना',
    tagline: 'आइए, मिलकर अपने गाँव की योजना बनाएँ।',
    pickVillage: 'अपना गाँव चुनिए',
    search: 'गाँव या पंचायत खोजिए…',
    continuePlan: 'मेरी योजना जारी रखें',
    noPlanYet: 'अभी कोई योजना शुरू नहीं हुई। नीचे से गाँव चुनिए और पहली सड़क बनाइए।',
    upload: 'अपना गाँव लाइए',
    uploadHint: 'स्वामित्व / कोई भी GeoJSON फ़ाइल डालिए',
    open: 'गाँव खोलें',
    back: 'घर',
    road: 'सड़क',
    drain: 'नाली',
    water: 'पानी पाइप',
    toilet: 'शौचालय',
    light: 'बिजली खंभा',
    measure: 'नापो',
    soon: 'जल्द आ रहा है',
    undo: 'वापस',
    redo: 'फिर से',
    tapStart: 'ज़मीन पर टैप करके सड़क का पहला बिंदु रखिए।',
    tapMore: 'मोड़ने के लिए टैप करते रहिए। पुरानी सड़क पर टैप करेंगे तो जुड़ जाएगी।',
    build: 'यह सड़क बनाओ',
    clear: 'मिटाओ',
    lastPoint: 'पिछला बिंदु',
    roadType: 'सड़क का प्रकार',
    width: 'चौड़ाई',
    thickness: 'मोटाई',
    shoulder: 'किनारा (हर तरफ़)',
    length: 'लंबाई',
    cost: 'अनुमान',
    left: 'बचा',
    fundedBy: 'खर्च यहाँ से',
    emptyWorks: 'अभी कुछ नहीं बना। आपका गाँव इंतज़ार कर रहा है।',
    measureHint: 'दूरी नापने के लिए दो जगह टैप कीजिए।',
    walls: 'फ़ोटो',
    breakdown: 'पैसा कहाँ जाता है',
    tooShort: 'यह सड़क बहुत छोटी है। थोड़ा दूर एक और बिंदु जोड़िए।',
    needTwo: 'पहले ज़मीन पर कम से कम दो बिंदु टैप कीजिए।',
    oldRoad: 'पुरानी सड़क',
    newRoad: 'नई सड़क',
  },
} as const;

export type Key = keyof typeof D.en;
export const tr = (lang: Lang, k: Key): string => D[lang][k];

// Messages with numbers in them
export const msg = {
  funds: (lang: Lang, scheme: string, left: string, cost: string) =>
    lang === 'hi'
      ? `अरे, ${scheme} में सिर्फ़ ${left} बचा है और यह सड़क ${cost} की है। चौड़ाई या मोटाई थोड़ी घटाइए, या दूसरी योजना चुनिए।`
      : `Oops, only ${left} is left in ${scheme}, and this road needs ${cost}. Try a narrower or lighter road, or pick another scheme.`,
  dup: (lang: Lang) =>
    lang === 'hi'
      ? 'यहाँ पहले से सड़क है। नई सड़क पुरानी के ऊपर नहीं बन सकती। किसी खाली जगह से रास्ता निकालिए।'
      : 'There is already a road here, and a new one cannot sit on top of it. Try a route through open ground.',
  done: (lang: Lang, cost: string) =>
    lang === 'hi' ? `शाबाश! सड़क योजना में जुड़ गई (${cost})।` : `Shabash! The road is in your plan (${cost}).`,
  wrongScheme: (lang: Lang) =>
    lang === 'hi' ? 'यह योजना इस काम के लिए नहीं है।' : 'This scheme cannot pay for this kind of work.',
  undone: (lang: Lang) => (lang === 'hi' ? 'आख़िरी काम वापस लिया।' : 'Last work taken back.'),
  redone: (lang: Lang) => (lang === 'hi' ? 'काम फिर से जोड़ा।' : 'Work put back.'),
  badFile: (lang: Lang, why: string) =>
    lang === 'hi' ? `यह फ़ाइल नहीं खुल पाई: ${why}` : `Could not open that file: ${why}`,
};

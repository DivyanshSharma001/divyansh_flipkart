/* Merchant catalogue (~200 items) with equivalence groups for Second Opinion (appendix).
   Hand-written anchor items drive the scenarios; the rest is deterministic filler. */
(function () {
  'use strict';
  const A = window.Anchor;
  const rnd = A.util.rng(2040);

  /* supported categories for Trust Check alternatives (TC-E15) */
  const SUPPORTED = ['insurance', 'electronics', 'groceries', 'travel', 'gifts', 'games', 'home'];

  const items = [
    /* --- S1: health insurance, equal cover group --- */
    { id: 'ins-securelife-plus', name: 'SecureLife Plus', merchant: 'SecureLife Insurance Ltd', merchantId: 'securelife', category: 'insurance', group: 'health-family-5L', price: 18000, period: 'year', spec: { en: 'Family floater · ₹5 lakh cover · 2-yr wait', hi: 'फ़ैमिली फ़्लोटर · ₹5 लाख कवर · 2 साल इंतज़ार' }, rating: 4.1, source: 'IRDAI filings + PolicyCompare', cities: ['all'], checkedH: 2 },
    { id: 'ins-carefirst-basic', name: 'CareFirst Basic', merchant: 'CareFirst Health', merchantId: 'carefirst', category: 'insurance', group: 'health-family-5L', price: 14200, period: 'year', spec: { en: 'Family floater · ₹5 lakh cover · 2-yr wait', hi: 'फ़ैमिली फ़्लोटर · ₹5 लाख कवर · 2 साल इंतज़ार' }, rating: 4.2, source: 'IRDAI filings + PolicyCompare', cities: ['all'], checkedH: 2 },
    { id: 'ins-healthnet-one', name: 'HealthNet One', merchant: 'HealthNet General', merchantId: 'healthnet', category: 'insurance', group: 'health-family-5L', price: 15900, period: 'year', spec: { en: 'Family floater · ₹5 lakh cover · 2-yr wait', hi: 'फ़ैमिली फ़्लोटर · ₹5 लाख कवर · 2 साल इंतज़ार' }, rating: 4.0, source: 'IRDAI filings + PolicyCompare', cities: ['all'], checkedH: 3 },
    { id: 'ins-localcare', name: 'LocalCare Family', merchant: 'LocalCare Mutual', merchantId: 'localcare', category: 'insurance', group: 'health-family-5L', price: 12100, period: 'year', spec: { en: 'Family floater · ₹5 lakh cover · 2-yr wait', hi: 'फ़ैमिली फ़्लोटर · ₹5 लाख कवर · 2 साल इंतज़ार' }, rating: 3.9, source: 'PolicyCompare', cities: ['Kolkata'], checkedH: 5 },
    { id: 'ins-suraksha', name: 'Suraksha Health 5', merchant: 'Suraksha General', merchantId: 'suraksha', category: 'insurance', group: 'health-family-5L', price: 19400, period: 'year', spec: { en: 'Family floater · ₹5 lakh cover · 2-yr wait', hi: 'फ़ैमिली फ़्लोटर · ₹5 लाख कवर · 2 साल इंतज़ार' }, rating: 4.0, source: 'IRDAI filings', cities: ['all'], checkedH: 6 },
    { id: 'ins-medishield-10', name: 'MediShield 10', merchant: 'MediShield', merchantId: 'medishield', category: 'insurance', group: 'health-family-10L', price: 16800, period: 'year', spec: { en: 'Family floater · ₹10 lakh cover · 3-yr wait', hi: 'फ़ैमिली फ़्लोटर · ₹10 लाख कवर · 3 साल इंतज़ार' }, rating: 4.3, source: 'IRDAI filings', cities: ['all'], checkedH: 4 },

    /* --- Flow 1: phone case (affiliate, yellow) --- */
    { id: 'el-casekart-armor', name: 'ArmorShell Case for Pixel 9', merchant: 'CaseKart', merchantId: 'casekart', category: 'electronics', group: 'case-pixel9-rugged', price: 1200, spec: { en: 'Rugged · MagSafe-style ring · drop-tested 3 m', hi: 'मज़बूत · मैगसेफ़ रिंग · 3 मी ड्रॉप-टेस्टेड' }, rating: 4.3, source: 'Flipkart + Amazon listings', cities: ['all'], checkedH: 1 },
    { id: 'el-toughguard', name: 'ToughGuard Pixel 9', merchant: 'GadgetHub', merchantId: 'gadgethub', category: 'electronics', group: 'case-pixel9-rugged', price: 1149, spec: { en: 'Rugged · ring · drop-tested 3 m', hi: 'मज़बूत · रिंग · 3 मी ड्रॉप-टेस्टेड' }, rating: 4.2, source: 'Flipkart listing', cities: ['all'], checkedH: 1 },
    { id: 'el-spigen-p9', name: 'Spigen Tough Armor P9', merchant: 'Spigen India', merchantId: 'spigen', category: 'electronics', group: 'case-pixel9-rugged', price: 1299, spec: { en: 'Rugged · kickstand · drop-tested 3 m', hi: 'मज़बूत · स्टैंड · 3 मी ड्रॉप-टेस्टेड' }, rating: 4.5, source: 'Brand store', cities: ['all'], checkedH: 2 },

    /* --- Kavita's grocery orders (pattern + approve & remember) --- */
    { id: 'gr-freshbasket-weekly', name: 'Weekly family basket', merchant: 'FreshBasket', merchantId: 'freshbasket', category: 'groceries', group: 'grocery-weekly-family', price: 6200, spec: { en: 'Staples + vegetables + dairy · family of 4', hi: 'राशन + सब्ज़ी + डेयरी · 4 लोगों का परिवार' }, rating: 4.1, source: 'Store prices, Bengaluru', cities: ['all'], checkedH: 2 },
    { id: 'gr-dailymart-weekly', name: 'Weekly family basket', merchant: 'DailyMart', merchantId: 'dailymart', category: 'groceries', group: 'grocery-weekly-family', price: 6050, spec: { en: 'Staples + vegetables + dairy · family of 4', hi: 'राशन + सब्ज़ी + डेयरी · 4 लोगों का परिवार' }, rating: 4.0, source: 'Store prices, Bengaluru', cities: ['all'], checkedH: 2 },
    { id: 'gr-minutes-weekly', name: 'Weekly family basket', merchant: 'Minutes Grocery', merchantId: 'minutes', category: 'groceries', group: 'grocery-weekly-family', price: 6390, spec: { en: 'Staples + vegetables + dairy · family of 4', hi: 'राशन + सब्ज़ी + डेयरी · 4 लोगों का परिवार' }, rating: 4.4, source: 'Store prices, Bengaluru', cities: ['all'], checkedH: 3 },

    /* --- Gifts for Amma (Me-First flow 1) --- */
    { id: 'gf-planter-set', name: 'Terracotta planter set (3)', merchant: 'GreenNest', merchantId: 'greennest', category: 'gifts', group: 'gift-garden', price: 1450, spec: { en: 'Hand-made · drainage holes · with saucers', hi: 'हाथ से बने · ड्रेनेज छेद · प्लेट सहित' }, rating: 4.5, source: 'Marketplace listings', cities: ['all'], checkedH: 3 },
    { id: 'gf-garden-kit', name: 'Garden tool kit with apron', merchant: 'Kisan Craft', merchantId: 'kisancraft', category: 'gifts', group: 'gift-garden', price: 1799, spec: { en: '5 tools · canvas apron · gift box', hi: '5 औज़ार · कैनवस एप्रन · गिफ़्ट बॉक्स' }, rating: 4.4, source: 'Marketplace listings', cities: ['all'], checkedH: 3 },
    { id: 'gf-herb-kit', name: 'Kitchen herb grow kit', merchant: 'GreenNest', merchantId: 'greennest', category: 'gifts', group: 'gift-garden', price: 899, spec: { en: 'Tulsi, mint, coriander · self-watering', hi: 'तुलसी, पुदीना, धनिया · खुद पानी देने वाला' }, rating: 4.2, source: 'Marketplace listings', cities: ['all'], checkedH: 4 },
    { id: 'gf-silk-saree', name: 'Kanchipuram silk saree', merchant: 'Nalli Silks', merchantId: 'nalli', category: 'gifts', group: 'gift-saree', price: 6500, spec: { en: 'Pure silk · zari border', hi: 'शुद्ध रेशम · ज़री बॉर्डर' }, rating: 4.7, source: 'Brand store', cities: ['all'], checkedH: 6 },

    /* --- Vihaan's game purchase (S2) --- */
    { id: 'gm-battlezone-gems', name: 'BattleZone 2400 gems', merchant: 'BattleZone Games', merchantId: 'battlezone', category: 'games', group: 'game-currency-bz', price: 1200, spec: { en: 'In-game currency · non-refundable', hi: 'गेम करेंसी · वापस नहीं होगी' }, rating: 4.0, source: 'Play Store', cities: ['all'], checkedH: 1 },
    { id: 'gm-battlezone-gems-promo', name: 'BattleZone 2400 gems (festival pack)', merchant: 'BattleZone Games', merchantId: 'battlezone', category: 'games', group: 'game-currency-bz', price: 1190, spec: { en: 'In-game currency · non-refundable', hi: 'गेम करेंसी · वापस नहीं होगी' }, rating: 4.0, source: 'Play Store', cities: ['all'], checkedH: 1 },

    /* --- Travel --- */
    { id: 'tr-blr-del-indigo', name: 'BLR → DEL, 6:10 am', merchant: 'IndiGo', merchantId: 'indigo', category: 'travel', group: 'flight-blr-del-morning', price: 5840, spec: { en: 'Economy · 15 kg · non-stop', hi: 'इकॉनमी · 15 किलो · नॉन-स्टॉप' }, rating: 4.1, source: 'Airline sites', cities: ['all'], checkedH: 1 },
    { id: 'tr-blr-del-airindia', name: 'BLR → DEL, 7:00 am', merchant: 'Air India', merchantId: 'airindia', category: 'travel', group: 'flight-blr-del-morning', price: 6120, spec: { en: 'Economy · 15 kg · non-stop', hi: 'इकॉनमी · 15 किलो · नॉन-स्टॉप' }, rating: 4.0, source: 'Airline sites', cities: ['all'], checkedH: 1 },

    /* --- Home --- */
    { id: 'hm-cleaning-weekly', name: 'Weekly home cleaning', merchant: 'UrbanHelp', merchantId: 'urbanhelp', category: 'home', group: 'cleaning-weekly-2bhk', price: 899, spec: { en: '2BHK · 3 hours · supplies included', hi: '2BHK · 3 घंटे · सामान सहित' }, rating: 4.3, source: 'Service apps', cities: ['all'], checkedH: 5 }
  ];

  /* Deterministic filler to reach ~200 items across groups */
  const filler = [
    { cat: 'electronics', group: 'earbuds-anc-mid', base: 3499, names: ['Boat Airdopes Pro', 'Noise Buds X', 'Realme Buds Air', 'OnePlus Nord Buds', 'JBL Wave Flex', 'Soundcore R50'], merchants: ['GadgetHub', 'Croma', 'Reliance Digital', 'Flipkart Retail'], spec: 'ANC · 30 h battery · BT 5.3', hiSpec: 'ANC · 30 घंटे बैटरी · BT 5.3' },
    { cat: 'electronics', group: 'charger-65w', base: 1799, names: ['Anker 65W GaN', 'Ugreen Nexode 65W', 'Portronics Adapto 65', 'Belkin BoostCharge 65W'], merchants: ['GadgetHub', 'Croma', 'Flipkart Retail'], spec: '65 W · USB-C PD · GaN', hiSpec: '65 वॉट · USB-C PD · GaN' },
    { cat: 'electronics', group: 'smartwatch-entry', base: 2499, names: ['Noise ColorFit', 'Fire-Boltt Ninja', 'Amazfit Bip', 'boAt Wave'], merchants: ['GadgetHub', 'Reliance Digital', 'Flipkart Retail'], spec: 'AMOLED · SpO2 · 7-day battery', hiSpec: 'AMOLED · SpO2 · 7 दिन बैटरी' },
    { cat: 'groceries', group: 'rice-basmati-5kg', base: 649, names: ['India Gate Basmati 5 kg', 'Daawat Rozana 5 kg', 'Fortune Biryani 5 kg', 'Kohinoor Super 5 kg'], merchants: ['FreshBasket', 'DailyMart', 'Minutes Grocery', 'BigBazaar Online'], spec: 'Basmati · 5 kg', hiSpec: 'बासमती · 5 किलो' },
    { cat: 'groceries', group: 'oil-sunflower-5l', base: 799, names: ['Fortune Sunlite 5 L', 'Saffola Gold 5 L', 'Gemini 5 L', 'Freedom 5 L'], merchants: ['FreshBasket', 'DailyMart', 'Minutes Grocery'], spec: 'Sunflower oil · 5 L', hiSpec: 'सूरजमुखी तेल · 5 लीटर' },
    { cat: 'groceries', group: 'milk-monthly', base: 1860, names: ['Nandini toned milk (month)', 'Amul Taaza (month)', 'Heritage toned (month)'], merchants: ['FreshBasket', 'Minutes Grocery', 'DailyMart'], spec: '1 L/day · 31 days', hiSpec: '1 लीटर/दिन · 31 दिन' },
    { cat: 'travel', group: 'hotel-goa-3n', base: 9800, names: ['Seaview Residency', 'Calangute Palms', 'Baga Bay Inn', 'Candolim Stay', 'Anjuna Breeze'], merchants: ['MakeMyTrip', 'Goibibo', 'Booking.com', 'Agoda'], spec: '3 nights · 3★ · breakfast', hiSpec: '3 रातें · 3★ · नाश्ता' },
    { cat: 'travel', group: 'train-mas-sbc', base: 1150, names: ['Shatabdi CC', 'Brindavan Exp CC', 'Vande Bharat CC'], merchants: ['IRCTC', 'ConfirmTkt', 'ixigo'], spec: 'Chennai → Bengaluru · chair car', hiSpec: 'चेन्नई → बेंगलुरु · चेयर कार' },
    { cat: 'gifts', group: 'gift-books', base: 699, names: ['Poetry anthology (hardback)', 'Cookbook: South Indian classics', 'Gardening year book', 'Classic novels box set'], merchants: ['Crossword', 'Sapna Book House', 'Flipkart Retail'], spec: 'Hardback · gift wrap', hiSpec: 'हार्डबैक · गिफ़्ट रैप' },
    { cat: 'gifts', group: 'gift-hamper-sweets', base: 1299, names: ['Diwali dry-fruit hamper', 'Mithai box 1 kg', 'Chocolate & nuts hamper', 'Assorted sweets tin'], merchants: ['Haldiram\'s', 'Anand Sweets', 'Ferns N Petals', 'IGP'], spec: '1 kg · festive box', hiSpec: '1 किलो · त्योहारी डिब्बा' },
    { cat: 'home', group: 'purifier-ro', base: 13999, names: ['Kent Grand+', 'Aquaguard Aura', 'Pureit Eco', 'Livpure Glo'], merchants: ['Croma', 'Reliance Digital', 'Flipkart Retail'], spec: 'RO+UV · 8 L', hiSpec: 'RO+UV · 8 लीटर' },
    { cat: 'home', group: 'mixer-750w', base: 3299, names: ['Preethi Zodiac', 'Bajaj Rex', 'Philips HL7756', 'Sujata Dynamix'], merchants: ['Croma', 'Flipkart Retail', 'Reliance Digital'], spec: '750 W · 3 jars', hiSpec: '750 वॉट · 3 जार' },
    { cat: 'insurance', group: 'term-1cr', base: 11800, names: ['SecureLife Term', 'TataCare Term', 'LIC Tech Term', 'Max Smart Term', 'HDFC Click2Protect'], merchants: ['SecureLife Insurance Ltd', 'Tata AIA', 'LIC', 'Max Life', 'HDFC Life'], spec: '₹1 crore · to age 60', hiSpec: '₹1 करोड़ · 60 साल तक', period: 'year' },
    { cat: 'insurance', group: 'motor-2w', base: 1450, names: ['Two-wheeler comprehensive', 'Bike shield', 'Ride secure'], merchants: ['Acko', 'Digit', 'ICICI Lombard'], spec: 'Comprehensive · 1 yr · ₹0 dep', hiSpec: 'पूरा कवर · 1 साल · ₹0 डेप', period: 'year' },
    { cat: 'games', group: 'game-pass-month', base: 499, names: ['GameFlix monthly', 'PlayMax pass', 'Arcadia monthly'], merchants: ['GameFlix', 'PlayMax', 'Arcadia'], spec: '1 month · 200+ games', hiSpec: '1 महीना · 200+ गेम' }
  ];

  let n = 0;
  filler.forEach((f) => {
    const count = f.group === 'hotel-goa-3n' || f.group === 'earbuds-anc-mid' ? 16 : 12;
    for (let i = 0; i < count; i++) {
      const name = f.names[i % f.names.length] + (i >= f.names.length ? ' · v' + (1 + Math.floor(i / f.names.length)) : '');
      const merchant = f.merchants[i % f.merchants.length];
      const price = Math.round((f.base * (0.82 + rnd() * 0.42)) / 10) * 10 - 1;
      items.push({
        id: 'fx-' + (++n),
        name,
        merchant,
        merchantId: merchant.toLowerCase().replace(/[^a-z0-9]/g, ''),
        category: f.cat,
        group: f.group,
        price,
        period: f.period,
        spec: { en: f.spec, hi: f.hiSpec },
        rating: Math.round((3.6 + rnd() * 1.1) * 10) / 10,
        source: 'Public listings',
        cities: rnd() > 0.9 ? ['Mumbai'] : ['all'],
        checkedH: 1 + Math.floor(rnd() * 8)
      });
    }
  });

  /* Product photos (Wikimedia Commons, free licences — see img/CREDITS.md). Items without a photo
     keep the coloured icon tile (pick 18A). */
  const IMG_BY_ID = { 'gf-planter-set': 'planter.jpg', 'gf-herb-kit': 'herbkit.jpg', 'gf-silk-saree': 'saree.jpg', 'el-casekart-armor': 'phonecase.jpg', 'el-toughguard': 'phonecase.jpg', 'el-spigen-p9': 'phonecase.jpg', 'hm-cleaning-weekly': 'cleaning.jpg' };
  const IMG_BY_GROUP = {
    'gift-hamper-sweets': 'sweets.jpg', 'gift-books': 'books.jpg', 'earbuds-anc-mid': 'earbuds.jpg', 'charger-65w': 'charger.jpg',
    'smartwatch-entry': 'smartwatch.jpg', 'grocery-weekly-family': 'groceries.jpg', 'rice-basmati-5kg': 'rice.jpg', 'oil-sunflower-5l': 'oil.jpg',
    'milk-monthly': 'milk.jpg', 'flight-blr-del-morning': 'flight.jpg', 'hotel-goa-3n': 'hotel.jpg', 'train-mas-sbc': 'train.jpg',
    'mixer-750w': 'mixer.jpg', 'purifier-ro': 'purifier.jpg', 'cleaning-weekly-2bhk': 'cleaning.jpg', 'game-currency-bz': 'games.jpg', 'game-pass-month': 'games.jpg'
  };
  items.forEach((it) => { const f = IMG_BY_ID[it.id] || IMG_BY_GROUP[it.group]; if (f) it.img = 'img/' + f; });

  A.data.catalogue = {
    items,
    SUPPORTED,
    byId(id) { return items.find((i) => i.id === id); },
    group(g) { return items.filter((i) => i.group === g); }
  };
})();

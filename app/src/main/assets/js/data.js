/**
 * All Saints' Church App - Church Library, Hymnal, Scripture & Almanac Data
 * Fully dynamic liturgical almanac containing all 365 days of 2026.
 */

const CHURCH_DATA = {
  almanacDatabase: {},

  // Library Items (Scriptures, Hymns, Prayers, Homilies)
  library: [
    {
      id: "lib-1",
      category: "scripture",
      title: "Psalm 23 (The Shepherd Psalm)",
      citation: "Psalm 23:1-6",
      snippet: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures...",
      fullText: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. He leads me in paths of righteousness for his name's sake. Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me. You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows. Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the Lord forever.",
      tags: ["comfort", "peace", "trust", "psalms"]
    },
    {
      id: "lib-2",
      category: "hymn",
      title: "Amazing Grace (How Sweet the Sound)",
      citation: "John Newton, 1779",
      snippet: "Amazing grace! How sweet the sound, That saved a wretch like me! I once was lost, but now am found...",
      fullText: "Amazing grace! How sweet the sound / That saved a wretch like me! / I once was lost, but now am found; / Was blind, but now I see.\n\n'Twas grace that taught my heart to fear, / And grace my fears relieved; / How precious did that grace appear / The hour I first believed.\n\nThrough many dangers, toils, and snares, / I have already come; / 'Tis grace hath brought me safe thus far, / And grace will lead me home.",
      tags: ["grace", "classic", "salvation", "hymn"]
    },
    {
      id: "lib-3",
      category: "prayer",
      title: "The Lord's Prayer (Pater Noster)",
      citation: "Matthew 6:9-13",
      snippet: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come, thy will be done...",
      fullText: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.",
      tags: ["daily", "foundation", "jesus", "prayer"]
    },
    {
      id: "lib-4",
      category: "scripture",
      title: "The Beatitudes (Sermon on the Mount)",
      citation: "Matthew 5:3-12",
      snippet: "Blessed are the poor in spirit, for theirs is the kingdom of heaven. Blessed are those who mourn...",
      fullText: "Blessed are the poor in spirit, for theirs is the kingdom of heaven.\nBlessed are those who mourn, for they shall be comforted.\nBlessed are the meek, for they shall inherit the earth.\nBlessed are those who hunger and thirst for righteousness, for they shall be satisfied.\nBlessed are the merciful, for they shall receive mercy.\nBlessed are the pure in heart, for they shall see God.\nBlessed are the peacemakers, for they shall be called sons of God.\nBlessed are those who are persecuted for righteousness' sake, for theirs is the kingdom of heaven.",
      tags: ["gospel", "holiness", "discipleship", "sermon on the mount"]
    },
    {
      id: "lib-5",
      category: "hymn",
      title: "Be Thou My Vision",
      citation: "Ancient Irish Hymn (Dallán Forgaill)",
      snippet: "Be Thou my Vision, O Lord of my heart; Naught be all else to me, save that Thou art...",
      fullText: "Be Thou my Vision, O Lord of my heart; / Naught be all else to me, save that Thou art / Thou my best thought, by day or by night, / Waking or sleeping, Thy presence my light.\n\nBe Thou my Wisdom, and Thou my true Word; / I ever with Thee and Thou with me, Lord; / Thou my great Father, I Thy true son; / Thou in me dwelling, and I with Thee one.\n\nRiches I heed not, nor man's empty praise, / Thou mine inheritance, now and always: / Thou and Thou only, first in my heart, / High King of Heaven, my Treasure Thou art.",
      tags: ["celtic", "devotion", "hymn", "worship"]
    },
    {
      id: "lib-6",
      category: "prayer",
      title: "Prayer of St. Francis (Instrument of Peace)",
      citation: "Peace Prayer",
      snippet: "Lord, make me an instrument of your peace: where there is hatred, let me sow love; where there is injury, pardon...",
      fullText: "Lord, make me an instrument of your peace:\nwhere there is hatred, let me sow love;\nwhere there is injury, pardon;\nwhere there is doubt, faith;\nwhere there is despair, hope;\nwhere there is darkness, light;\nwhere there is sadness, joy.\n\nO Divine Master, grant that I may not so much seek to be consoled as to console,\nto be understood as to understand,\nto be loved as to love.\nFor it is in giving that we receive,\nit is in pardoning that we are pardoned,\nand it is in dying that we are born to eternal life. Amen.",
      tags: ["peace", "saint francis", "charity", "prayer"]
    },
    {
      id: "lib-7",
      category: "sermon",
      title: "Walking in the Light of Divine Grace",
      citation: "Father Michael Sterling",
      snippet: "An exploration of everyday discipleship, interior stillness, and carrying light into the modern world.",
      fullText: "In our hurried modern lives, silence has become rare and precious. When we step inside the sanctuary, Christ invites us not to escape the world, but to be renewed with grace so we may love and serve with renewed steadfastness. Keep your lamps trimmed and burning.",
      tags: ["homily", "grace", "church", "audio"]
    },
    {
      id: "lib-8",
      category: "scripture",
      title: "The Great Hymn of Love",
      citation: "1 Corinthians 13:4-8",
      snippet: "Love is patient and kind; love does not envy or boast; it is not arrogant or rude...",
      fullText: "Love is patient and kind; love does not envy or boast; it is not arrogant or rude. It does not insist on its own way; it is not irritable or resentful; it does not rejoice at wrongdoing, but rejoices with the truth. Love bears all things, believes all things, hopes all things, endures all things. Love never ends.",
      tags: ["epistles", "love", "paul", "scripture"]
    },
    {
      id: "lib-9",
      category: "prayer",
      title: "The Angelus",
      citation: "Traditional Incarnation Prayer",
      snippet: "The Angel of the Lord declared unto Mary, and she conceived of the Holy Spirit...",
      fullText: "℣. The Angel of the Lord declared unto Mary,\n℟. And she conceived of the Holy Spirit.\nHail Mary...\n\n℣. Behold the handmaid of the Lord.\n℟. Be it done unto me according to Thy word.\nHail Mary...\n\n℣. And the Word was made flesh,\n℟. And dwelt among us.\nHail Mary...\n\n℣. Pray for us, O Holy Mother of God,\n℟. That we may be made worthy of the promises of Christ.\n\nLet us pray: Pour forth, we beseech Thee, O Lord, Thy grace into our hearts; that we, to whom the incarnation of Christ, Thy Son, was made known by the message of an angel, may by His passion and cross be brought to the glory of His resurrection, through the same Christ our Lord. Amen.",
      tags: ["marian", "angelus", "tradition", "prayer"]
    },
    {
      id: "lib-10",
      category: "hymn",
      title: "Holy, Holy, Holy! Lord God Almighty!",
      citation: "Reginald Heber, 1826",
      snippet: "Holy, holy, holy! Lord God Almighty! Early in the morning our song shall rise to Thee...",
      fullText: "Holy, holy, holy! Lord God Almighty! / Early in the morning our song shall rise to Thee; / Holy, holy, holy, merciful and mighty! / God in three Persons, blessed Trinity!\n\nHoly, holy, holy! all the saints adore Thee, / Casting down their golden crowns around the glassy sea; / Cherubim and seraphim falling down before Thee, / Which wert, and art, and evermore shalt be.",
      tags: ["trinity", "praise", "hymn", "cathedral"]
    }
  ],

  // Sacred Books Library for Liturgical Reading
  churchBooks: {
    prabhuBhoj: {
      id: "prabhuBhoj",
      title: "Prabhu Bhoj",
      tag: "पवित्र प्रभु भोज • Order of Holy Communion",
      subtitle: "पवित्र प्रभु भोज की आराधना विधि • Eucharistic Service",
      bookUrl: "books/prabhu_bhoj.html",
      htmlUrl: "books/prabhu_bhoj.html",
      pdfUrl: "books/prabhu_bhoj.html",
      sections: [
        {
          rubric: "प्रारम्भिक प्रार्थना (Collect for Purity)",
          text: "हे सर्वशक्तिमान परमेश्वर, जिस के साम्हने सब मन खुले हैं, और सब लालसायें प्रगट हैं, और जिस से कोई भेद छिपा नहीं है; हमारे मनों के विचारों को अपनी पवित्र आत्मा की प्रेरणा से शुद्ध कर, कि हम तुझ से सच्चा प्रेम रखें, और तेरे पवित्र नाम की यथार्थ स्तुति करें; हमारे प्रभु यीशु मसीह के द्वारा।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "व्यवस्था का सार (Summary of the Law)",
          text: "हमारे प्रभु यीशु मसीह ने कहा: 'तू प्रभु अपने परमेश्वर से अपने सारे मन, और अपने सारे प्राण, और अपनी सारी बुद्धि के साथ प्रेम रख।' यह मुख्य और पहली आज्ञा है। और दूसरी इसी के समान है: 'तू अपने पड़ोसी से अपने समान प्रेम रख।' इन्हीं दो आज्ञाओं पर सारी व्यवस्था और भविष्यद्वक्ताओं का आधार है।",
          dialogue: "जमाअत: हे प्रभु, हम पर दया कर, और इन सारी विधियों पर चलने के लिये हमारे मनों को अपनी ओर फेर।"
        },
        {
          rubric: "पाप-अंगीकार और क्षमा (Confession & Absolution)",
          text: "हे सर्वशक्तिमान परमेश्वर, हमारे स्वर्गीय पिता, हम ने अपने विचारों, वचनों और कामों से तेरे विरुद्ध पाप किया है। हम सच्चे मन से पश्चाताप करते हैं। अपने पुत्र हमारे प्रभु यीशु मसीह के निमित्त हम पर दया कर, और हमारे सब पापों को क्षमा कर, कि हम नई आत्मा से तेरी सेवा करें और तेरे पवित्र नाम की महिमा करें।",
          dialogue: "याजक: सर्वशक्तिमान परमेश्वर तुम पर दया करे, और प्रभु यीशु मसीह के द्वारा तुम्हारे सब पापों को क्षमा करके अनन्त जीवन में पहुँचाए। आमीन।"
        },
        {
          rubric: "सुरसुम कोर्दा और संक्तुस (Sursum Corda & Sanctus)",
          text: "याजक: प्रभु तुम्हारे साथ हो।\nजमाअत: और तेरी आत्मा के साथ भी।\nयाजक: अपने मनों को ऊपर उठाओ।\nजमाअत: हम प्रभु की ओर उठाते हैं।\nयाजक: आओ हम अपने प्रभु परमेश्वर का धन्यवाद करें।\nजमाअत: यह उचित और धर्मयुक्त है।",
          dialogue: "तमाम दूतों और प्रधान दूतों और स्वर्ग की सारी सेना के साथ मिलकर हम तेरे तेजोमय नाम की स्तुति और प्रशंसा करते हैं: 'पवित्र, पवित्र, पवित्र, सेनाओं का प्रभु परमेश्वर! स्वर्ग और पृथ्वी तेरे तेज से परिपूर्ण हैं! परमप्रधान में होशाना! धन्य वह जो प्रभु के नाम से आता है!'"
        },
        {
          rubric: "संस्थापन के वचन (Words of Institution)",
          text: "क्योंकि जिस रात वह पकड़वाया गया, उस ने रोटी ली; और धन्यवाद करके तोड़ी, और अपने चेलों को देकर कहा: 'लो, खाओ; यह मेरी देह है जो तुम्हारे लिये दी जाती है: मेरे स्मरण के लिये यह किया करो।' उसी रीति से बियारी के पीछे उस ने कटोरा भी लिया और धन्यवाद करके उन्हें दिया और कहा: 'तुम सब इस में से पीओ; क्योंकि यह वाचा का मेरा वह लोहू है, जो बहुतों के पापों की क्षमा के लिये बहाया जाता है; जब कभी तुम इसे पीओ, मेरे स्मरण के लिये यही किया करो।'",
          dialogue: "जमाअत: मसीह मरा, मसीह जी उठा, मसीह फिर आएगा!"
        },
        {
          rubric: "मेमने की स्तुति (Agnus Dei - Lamb of God)",
          text: "हे परमेश्वर के मेमने, जो जगत के पाप उठा ले जाता है, हम पर दया कर।\nहे परमेश्वर के मेमने, जो जगत के पाप उठा ले जाता है, हम पर दया कर।\nहे परमेश्वर के मेमने, जो जगत के पाप उठा ले जाता है, हमें अपनी शान्ति दे।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "प्रभु की प्रार्थना (The Lord's Prayer)",
          text: "हे हमारे पिता, तू जो स्वर्ग में है, तेरा नाम पवित्र माना जाए। तेरा राज्य आए। तेरी इच्छा जैसी स्वर्ग में पूरी होती है, वैसे ही पृथ्वी पर भी हो। हमारे दिन भर की रोटी आज हमें दे। और जिस प्रकार हम ने अपने अपराधियों को क्षमा किया है, वैसे ही तू भी हमारे अपराधों को क्षमा कर। और हमें परीक्षा में न ला, परन्तु बुराई से बचा; क्योंकि राज्य और पराक्रम और महिमा सदा तेरे ही हैं।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "धन्यवाद और अन्तिम आशीष (Thanksgiving & The Blessing)",
          text: "सर्वशक्तिमान और अमर परमेश्वर, हम हृदय से तेरा धन्यवाद करते हैं कि तू ने अपने पुत्र हमारे उद्धारकर्ता यीशु मसीह की बहुमूल्य देह और लोहू के आत्मिक भोजन से हमारा पोषण किया।\n\nपरमेश्वर की शान्ति, जो समस्त समझ से परे है, तुम्हारे मनों और विचारों को मसीह यीशु की पहचान और प्रेम में सुरक्षित रखे; और सर्वशक्तिमान परमेश्वर, पिता, पुत्र, और पवित्र आत्मा की आशीष तुम पर सदा बनी रहे।",
          dialogue: "जमाअत: आमीन। मसीह की शान्ति में विदा हो। परमेश्वर का धन्यवाद हो!"
        }
      ]
    },
    ashayeRabbani: {
      id: "ashayeRabbani",
      title: "Ashaye Rabbani",
      tag: "अशा-ए-रब्बानी • Sacred Feast of the Lord",
      subtitle: "दस्तरख़्वान-ए-रब्बानी की मुक़द्दस रस्म • Sacred Table Liturgy",
      bookUrl: "books/ashaye_rabbani.html",
      htmlUrl: "books/ashaye_rabbani.html",
      pdfUrl: "books/ashaye_rabbani.html",
      sections: [
        {
          rubric: "दस्तरख़्वान-ए-रब्बानी की दावत (The Invitation to the Table)",
          text: "तुम जो अपने गुनाहों से सच्ची तौबा करते हो, और अपने पड़ोसियों के साथ सुलह और मोहब्बत में रहना चाहते हो, और ख़ुदावंद के अहकाम के मुताबिक़ नई ज़िन्दगी बसर करने का अज़्म रखते हो; क़रीब आओ, और ईमान के साथ इस मुक़द्दस भेदी को अपनी रूहानी तसल्ली और हिदायत के लिये क़ुबूल करो।",
          dialogue: "जमाअत: ऐ ख़ुदावंद, हम तेरी रहमत के भरोसे तेरे दस्तरख़्वान पर हाज़िर होते हैं।"
        },
        {
          rubric: "इक़रार-ए-गुनाह और बख़्शिश (Confession & Absolution)",
          text: "ऐ कादिर-ए-मुतलक ख़ुदा, हमारे आसमानी बाप, हम इक़रार करते हैं कि हम ने ख़यालात, अल्फ़ाज़ और आमाल से तेरे हुज़ूर गुनाह किया है। हम दिल से शर्मिन्दा हैं। अपने प्यारे फ़रज़न्द यीशु मसीह के वसीले से हम पर रहम फ़रमा और हमारे गुनाहों को मुआफ़ कर, ताकि हम तेरी नई ज़िन्दगी में चल सकें।",
          dialogue: "पादरी: कादिर-ए-मुतलक ख़ुदा तुम पर रहम फ़रमाए, और हमारे ख़ुदावंद यीशु मसीह के वसीले तुम्हारे गुनाहों को मुआफ़ करके हमेशा की ज़िन्दगी में दाख़िल करे। आमीन।"
        },
        {
          rubric: "सुरसुम कोर्दा और संक्तुस (Sursum Corda & Sanctus)",
          text: "पादरी: ख़ुदावंद तुम्हारे साथ हो।\nजमाअत: और तेरी रूह के साथ भी।\nपादरी: अपने दिलों को ऊपर उठाओ।\nजमाअत: हम ख़ुदावंद की तरफ़ उठाते हैं।\nपादरी: आओ हम अपने ख़ुदावंद ख़ुदा का शुक्र करें।\nजमाअत: यह वाजिब और दुरुस्त है।",
          dialogue: "तमाम फ़रिश्तों और मुक़द्दसों के साथ मिलकर हम गाते हैं: 'क़ुद्दूस, क़ुद्दूस, क़ुद्दूस, रब्बुल अफ़वाज! आसमान और ज़मीन तेरे जलाल से मामूर हैं! आसमान पर होशाना! मुबारक वह जो ख़ुदावंद के नाम से आता है!'"
        },
        {
          rubric: "दुआ-ए-शुक़्रगुज़ारी (Eucharistic Thanksgiving)",
          text: "ऐ कादिर-ए-मुतलक आसमानी बाप, हम दिल से तेरा शुक्र अदा करते हैं कि तू ने अपने इकलौते फ़रज़न्द यीशु मसीह को हमारे लिये बख़्शा। उस की क़ुर्बानी और ख़ून के वसीले से हमें मुआफ़ी और नजात नसीब हुई। हमें अपनी पाकीज़ा रूह से भर दे ताकि हम हमेशा तेरी मुक़द्दस राहों पर क़दम बढ़ाएं।",
          dialogue: "जमाअत: आमीन। मुबारक हो ख़ुदावंद का नाम।"
        },
        {
          rubric: "कलमात-ए-इस्तक़रार (Words of Institution)",
          text: "जिस रात हमारे ख़ुदावंद यीशु मसीह को पकड़वाया गया, उस ने रोटी ली; और शुक्र करके तोड़ी, और अपने शागिर्दों को देकर फ़रमाया: 'लो, खाओ; यह मेरा बदन है जो तुम्हारे वास्ते दिया जाता है: मेरी यादगारी के लिये यही किया करो।' इसी तरह खाने के बाद उस ने प्याला भी लिया और शुक्र करके उन्हें दिया और फ़रमाया: 'तुम सब इस में से पीओ; क्यूँकि यह अहद-ए-जदीद का मेरा वह ख़ून है जो बहुतों के गुनाहों की मुआफ़ी के लिये बहाया जाता है।'",
          dialogue: "जमाअत: मसीह मरा, मसीह जी उठा, मसीह जलाल के साथ फिर आएगा!"
        },
        {
          rubric: "दुआ-ए-रब्बानी (The Lord's Prayer)",
          text: "ऐ हमारे बाप, तू जो आसमान पर है, तेरा नाम पाक माना जाए। तेरी बादशाही आए। तेरी मर्ज़ी जैसी आसमान पर पूरी होती है, ज़मीन पर भी हो। हमारे रोज़ की रोटी आज हमें बख़्श दे। और जिस तरह हम अपने क़र्ज़दारों को मुआफ़ करते हैं, तू भी हमारे क़र्ज़ हमें मुआफ़ कर। और हमें आज़माइश में न ला, बल्कि बुराई से बचा; क्यूँकि बादशाही और क़ुदरत और जलाल हमेशा तेरे ही हैं।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "दुआ-ए-तहफ्फुज़ और बरकत (Benediction)",
          text: "ख़ुदा की सलामती, जो अक़्ल से बाहर है, तुम्हारे दिलों और ख़यालात को मसीह यीशु में महफ़ूज़ रखे; और कादिर-ए-मुतलक ख़ुदा, बाप, बेटा, और रूह-उल-क़ुदुस की बरकत तुम पर हमेशा बनी रहे।",
          dialogue: "जमाअत: आमीन। सलामती के साथ जाओ।"
        }
      ]
    },
    aaradhanaa: {
      id: "aaradhanaa",
      title: "Pratahkaaleen aur Saayankaleen Aaradhanaa",
      tag: "दैनिक प्रार्थना पुस्तक • Daily Morning & Evening Prayer Book",
      subtitle: "प्रातःकालीन और सायंकालीन नित्य आराधना विधि • Church of North India Daily Office",
      bookUrl: "books/aaradhana.html",
      htmlUrl: "books/aaradhana.html",
      pdfUrl: "books/aaradhana.html",
      sections: [
        {
          rubric: "1. प्रातःकालीन प्रारम्भिक वचन (Morning Opening & Versicles)",
          text: "याजक: हे प्रभु, तू हमारे ओंठों को खोल।\nजमाअत: और हमारा मुख तेरा गुणगान करेगा।\nयाजक: हे परमेश्वर, हमारी सहायता के लिये शीघ्र आ।\nजमाअत: हे प्रभु, हमारी सहायता करने में विलम्ब न कर।\nयाजक: पिता और पुत्र और पवित्र आत्मा की महिमा हो;\nजमाअत: जैसे आदि में थी, अब है, और युगानुयुग रहेगी। आमीन।\nयाजक: प्रभु की स्तुति करो!\nजमाअत: प्रभु का नाम धन्य हो!",
          dialogue: "हल्लिलूय्याह! प्रभु के पवित्र मन्दिर में उपस्थित होकर हम उसका आदर करते हैं।"
        },
        {
          rubric: "2. वेनिते - आओ हम प्रभु के लिये गाएं (Venite, Exultemus Domino - Psalm 95)",
          text: "आओ, हम यहोवा के लिये जयजयकार करें; अपने उद्धार की चट्टान का जयजयकार करें!\nधन्यवाद करते हुए उसके सम्मुख आएं, और भजनों से उसका जयजयकार करें।\nक्योंकि यहोवा महान ईश्वर है, और सब देवताओं के ऊपर महान राजा है।\nपृथ्वी के गहरे स्थान उसी के हाथ में हैं, और पहाड़ों के शिखर भी उसी के हैं।\nसमुद्र उसी का है, उसी ने उसको बनाया; और उसके हाथों ने सूखी भूमि रची।\nआओ हम झुकें और दण्डवत करें; अपने सृजनहार यहोवा के साम्हने घुटने टेकें!\nक्योंकि वही हमारा परमेश्वर है, और हम उसकी चराई की प्रजा और उसके हाथ की भेड़ें हैं।",
          dialogue: "पिता और पुत्र और पवित्र आत्मा की महिमा हो; जैसे आदि में थी, अब है, और युगानुयुग रहेगी। आमीन।"
        },
        {
          rubric: "3. ते देउम लौदामस (Te Deum Laudamus - हम तेरी स्तुति करते हैं)",
          text: "हे परमेश्वर, हम तेरी स्तुति करते हैं; हम अंगीकार करते हैं कि तू ही प्रभु है।\nसमस्त पृथ्वी तेरे सम्मुख झुकती है, तू अनादि अनन्त पिता है।\nतेरे सम्मुख सब स्वर्गदूत, सब आकाश और उनके सारे अधिकार निरन्तर पुकारते हैं:\n'पवित्र, पवित्र, पवित्र, सेनाओं का प्रभु परमेश्वर! स्वर्ग और पृथ्वी तेरे तेज और महिमा से परिपूर्ण हैं!'\nप्रेरितों का तेजोमय मण्डल तेरी स्तुति करता है।\nभविष्यद्वक्ताओं का प्रशंसनीय समाज तेरी स्तुति करता है।\nशहीदों की श्वेत-वस्त्रधारी सेना तेरी स्तुति करती है।\nसंसार भर में पवित्र कलीसिया तेरा अंगीकार करती है: असीम ऐश्वर्यवान पिता, तेरा आदरणीय सच्चा और एकलौता पुत्र, और सान्त्वनादाता पवित्र आत्मा!",
          dialogue: "तू महिमा का राजा है, हे मसीह! तू सनातन पिता का अनन्त पुत्र है।"
        },
        {
          rubric: "4. प्रेरितों का धर्म-सार (The Apostles' Creed - प्रेरितिक विश्वास)",
          text: "मैं विश्वास करता हूँ सर्वशक्तिमान परमेश्वर, आकाश और पृथ्वी के सृजनहार पर;\nऔर उसके एकलौते पुत्र हमारे प्रभु यीशु मसीह पर, जो पवित्र आत्मा से गर्भ में आया, कुंवारी मरियम से उत्पन्न हुआ, पुन्तियुस पीलातुस के समय में दुःख उठाया, क्रूस पर चढ़ाया गया, मर गया और गाड़ा गया;\nतीसरे दिन मृतकों में से जी उठा, स्वर्ग पर चढ़ गया, और सर्वशक्तिमान परमेश्वर पिता के दाहिने हाथ बैठा है; जहां से वह जीवितों और मृतकों का न्याय करने को आएगा।\nमैं विश्वास करता हूँ पवित्र आत्मा पर, पवित्र सार्वलौकिक कलीसिया पर, पवित्रों की संगति पर, पापों की क्षमा पर, देह के पुनरुत्थान पर, और अनन्त जीवन पर।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "5. प्रभु की प्रार्थना (The Lord's Prayer - हे हमारे पिता)",
          text: "याजक: प्रभु तुम्हारे साथ हो।\nजमाअत: और तेरी आत्मा के साथ भी।\nयाजक: आओ हम प्रार्थना करें। हे प्रभु, हम पर दया कर।\nजमाअत: हे मसीह, हम पर दया कर।\nयाजक: हे प्रभु, हम पर दया कर।\n\nहे हमारे पिता, तू जो स्वर्ग में है, तेरा नाम पवित्र माना जाए। तेरा राज्य आए। तेरी इच्छा जैसी स्वर्ग में पूरी होती है, वैसे ही पृथ्वी पर भी हो। हमारे दिन भर की रोटी आज हमें दे। और जिस प्रकार हम ने अपने अपराधियों को क्षमा किया है, वैसे ही तू भी हमारे अपराधों को क्षमा कर। और हमें परीक्षा में न ला, परन्तु बुराई से बचा; क्योंकि राज्य और पराक्रम और महिमा सदा तेरे ही हैं।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "6. दैनिक याचनाएं व शांति की प्रार्थना (Suffrages & Collect for Peace)",
          text: "याजक: हे प्रभु, अपनी दया हम पर प्रगट कर।\nजमाअत: और अपना उद्धार हमें प्रदान कर।\nयाजक: हे प्रभु, हमारे शासकों और कलीसिया के अगवों को सुरक्षित रख।\nजमाअत: और जब हम तुझे पुकारें, कृपा से हमारी सुन।\nयाजक: अपने सेवकों को धार्मिकता से सुसज्जित कर।\nजमाअत: और अपनी चुनी हुई प्रजा को आनन्दित कर।\n\nहे परमेश्वर, जो शान्ति का कर्ता और प्रेम का प्रेमी है; जिसे जानना अनन्त जीवन और जिसकी सेवा करना पूर्ण स्वतंत्रता है: अपने दीन सेवकों को अपने शत्रुओं के सब आक्रमणों से बचा, ताकि हम तेरी शरण पर भरोसा रखकर किसी विरोधी के भय से न डरें; हमारे प्रभु यीशु मसीह के पराक्रम के द्वारा।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "7. दैनिक अनुग्रह की प्रार्थना (Collect for Grace)",
          text: "हे प्रभु, हमारे स्वर्गीय पिता, सर्वशक्तिमान और अमर परमेश्वर, जिसने हमें कुशलतापूर्वक इस दिन के आरम्भ तक पहुँचाया है: आज के दिन अपने महापराक्रम से हमारी रक्षा कर; और अनुग्रह कर कि आज हम किसी पाप में न गिरें, और न किसी विपत्ति में फंसें; परन्तु हमारे सारे कार्य तेरे मार्गदर्शन से ऐसे संचालित हों कि हम तेरे सम्मुख सदा वही करें जो तेरी दृष्टि में भला और ग्रहणयोग्य है; हमारे प्रभु यीशु मसीह के द्वारा।",
          dialogue: "जमाअत: आमीन।"
        },
        {
          rubric: "8. सायंकालीन प्रार्थना और नंक दिमित्तिस (Evening Canticle & Nunc Dimittis)",
          text: "हे प्रभु, अब तू अपने दास को अपने वचन के अनुसार शान्ति से विदा करता है;\nक्योंकि मेरी आंखों ने तेरे उद्धार को देख लिया है,\nजिस को तू ने सब जातियों के साम्हने तैयार किया है;\nकि वह अन्यजातियों के प्रगट होने के लिये ज्योति, और तेरी प्रजा इस्राएल की महिमा हो।\n\nहे कृपानिधान प्रभु, रात्रि के अन्धकार में हमारा रक्षक हो, और इस रात के समस्त विपत्तियों और भयों से हमें सुरक्षित रख; हमारे एकमात्र उद्धारकर्ता यीशु मसीह के प्रेम के कारण।",
          dialogue: "पिता और पुत्र और पवित्र आत्मा की महिमा हो; जैसे आदि में थी, अब है, और युगानुयुग रहेगी। आमीन।"
        },
        {
          rubric: "9. अन्तिम आशीष और अनुग्रह (The Grace & Benediction)",
          text: "हमारे प्रभु यीशु मसीह का अनुग्रह, और परमेश्वर का प्रेम, और पवित्र आत्मा की संगति हम सब के साथ सदा होती रहे।",
          dialogue: "जमाअत: आमीन। प्रभु की स्तुति हो!"
        }
      ]
    },
    masihiGeet: {
      id: "masihiGeet",
      title: "Masihi Geeton Ka Sangrah",
      tag: "मसीही गीत संग्रह • Traditional Hymnal",
      subtitle: "मसीही आराधना एवं स्तुति के पारम्परिक भजन • Hymns of Faith",
      sections: []
    },
    additionalSongs: {
      id: "additionalSongs",
      title: "Additional Songs of Church",
      tag: "चर्च के अतिरिक्त गीत • Supplementary Worship",
      subtitle: "समकालीन एवं स्थानीय मण्डली के स्तुति गीत • Contemporary Praise",
      sections: []
    }
  }
};

if (typeof window !== 'undefined') {
  window.CHURCH_DATA = CHURCH_DATA;
}

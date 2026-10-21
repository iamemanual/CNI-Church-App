/**
 * All Saints' Church App - Church Library, Hymnal, Scripture & Almanac Data
 * Fully dynamic liturgical almanac containing all 365 days of 2026.
 */

const CHURCH_DATA = {
  almanacDatabase: {
  "2026-01-01": {
    "dateKey": "2026-01-01",
    "day": 1,
    "monthName": "January",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 4",
      "Genesis / उत्पत्ति 2:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 3",
      "Isaiah / यशायाह 5:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-02": {
    "dateKey": "2026-01-02",
    "day": 2,
    "monthName": "January",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 7",
      "Genesis / उत्पत्ति 3:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 5",
      "Isaiah / यशायाह 6:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-03": {
    "dateKey": "2026-01-03",
    "day": 3,
    "monthName": "January",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 10",
      "Genesis / उत्पत्ति 4:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 7",
      "Isaiah / यशायाह 7:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-04": {
    "dateKey": "2026-01-04",
    "day": 4,
    "monthName": "January",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "4th Sunday • Epiphany & Ordinary Time",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 13",
      "Genesis / उत्पत्ति 5:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 6:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 9",
      "Isaiah / यशायाह 8:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 7:1–12",
      "Psalms / भजन संहिता 17",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 6:1–14",
      "*Gosp.** John / यूहन्ना 8:1–19"
    ]
  },
  "2026-01-05": {
    "dateKey": "2026-01-05",
    "day": 5,
    "monthName": "January",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 16",
      "Genesis / उत्पत्ति 6:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 7:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 11",
      "Isaiah / यशायाह 9:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-06": {
    "dateKey": "2026-01-06",
    "day": 6,
    "monthName": "January",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 19",
      "Genesis / उत्पत्ति 7:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 8:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 13",
      "Isaiah / यशायाह 10:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-07": {
    "dateKey": "2026-01-07",
    "day": 7,
    "monthName": "January",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 22",
      "Genesis / उत्पत्ति 8:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 9:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 15",
      "Isaiah / यशायाह 11:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-08": {
    "dateKey": "2026-01-08",
    "day": 8,
    "monthName": "January",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 25",
      "Genesis / उत्पत्ति 9:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 10:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 17",
      "Isaiah / यशायाह 12:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 11:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-09": {
    "dateKey": "2026-01-09",
    "day": 9,
    "monthName": "January",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 28",
      "Genesis / उत्पत्ति 10:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 11:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 19",
      "Isaiah / यशायाह 13:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 12:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-10": {
    "dateKey": "2026-01-10",
    "day": 10,
    "monthName": "January",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 31",
      "Genesis / उत्पत्ति 11:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 12:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 21",
      "Isaiah / यशायाह 14:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 13:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-11": {
    "dateKey": "2026-01-11",
    "day": 11,
    "monthName": "January",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "11th Sunday • Epiphany & Ordinary Time",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 34",
      "Genesis / उत्पत्ति 12:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 13:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 23",
      "Isaiah / यशायाह 15:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 14:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 14:1–12",
      "Psalms / भजन संहिता 45",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 13:1–14",
      "*Gosp.** John / यूहन्ना 15:1–19"
    ]
  },
  "2026-01-12": {
    "dateKey": "2026-01-12",
    "day": 12,
    "monthName": "January",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 37",
      "Genesis / उत्पत्ति 13:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 14:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 25",
      "Isaiah / यशायाह 16:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 15:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-13": {
    "dateKey": "2026-01-13",
    "day": 13,
    "monthName": "January",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 40",
      "Genesis / उत्पत्ति 14:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 15:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 27",
      "Isaiah / यशायाह 17:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 16:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-14": {
    "dateKey": "2026-01-14",
    "day": 14,
    "monthName": "January",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 43",
      "Genesis / उत्पत्ति 15:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 16:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 29",
      "Isaiah / यशायाह 18:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 17:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-15": {
    "dateKey": "2026-01-15",
    "day": 15,
    "monthName": "January",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 46",
      "Genesis / उत्पत्ति 16:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 17:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 31",
      "Isaiah / यशायाह 19:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 18:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-16": {
    "dateKey": "2026-01-16",
    "day": 16,
    "monthName": "January",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 49",
      "Genesis / उत्पत्ति 17:1–14",
      "Romans / रोमियों 3:1–12",
      "Matthew / मत्ती 18:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 33",
      "Isaiah / यशायाह 20:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 19:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-17": {
    "dateKey": "2026-01-17",
    "day": 17,
    "monthName": "January",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 52",
      "Genesis / उत्पत्ति 18:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 19:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 35",
      "Isaiah / यशायाह 21:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 20:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-18": {
    "dateKey": "2026-01-18",
    "day": 18,
    "monthName": "January",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "18th Sunday • Epiphany & Ordinary Time",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 55",
      "Genesis / उत्पत्ति 19:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 20:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 37",
      "Isaiah / यशायाह 22:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 21:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 21:1–12",
      "Psalms / भजन संहिता 73",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 4:1–14",
      "*Gosp.** John / यूहन्ना 1:1–19"
    ]
  },
  "2026-01-19": {
    "dateKey": "2026-01-19",
    "day": 19,
    "monthName": "January",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 58",
      "Genesis / उत्पत्ति 20:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 21:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 39",
      "Isaiah / यशायाह 23:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 22:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-20": {
    "dateKey": "2026-01-20",
    "day": 20,
    "monthName": "January",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 61",
      "Genesis / उत्पत्ति 21:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 22:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 41",
      "Isaiah / यशायाह 24:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 23:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-21": {
    "dateKey": "2026-01-21",
    "day": 21,
    "monthName": "January",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 64",
      "Genesis / उत्पत्ति 22:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 23:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 43",
      "Isaiah / यशायाह 25:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 24:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-22": {
    "dateKey": "2026-01-22",
    "day": 22,
    "monthName": "January",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 67",
      "Genesis / उत्पत्ति 23:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 24:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 45",
      "Isaiah / यशायाह 26:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 1:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-23": {
    "dateKey": "2026-01-23",
    "day": 23,
    "monthName": "January",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 70",
      "Genesis / उत्पत्ति 24:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 25:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 47",
      "Isaiah / यशायाह 27:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 2:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-24": {
    "dateKey": "2026-01-24",
    "day": 24,
    "monthName": "January",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 73",
      "Genesis / उत्पत्ति 25:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 26:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 49",
      "Isaiah / यशायाह 28:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 3:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-25": {
    "dateKey": "2026-01-25",
    "day": 25,
    "monthName": "January",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "25th Sunday • Epiphany & Ordinary Time",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 76",
      "Genesis / उत्पत्ति 26:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 27:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 51",
      "Isaiah / यशायाह 29:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 28:1–12",
      "Psalms / भजन संहिता 101",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 11:1–14",
      "*Gosp.** John / यूहन्ना 8:1–19"
    ]
  },
  "2026-01-26": {
    "dateKey": "2026-01-26",
    "day": 26,
    "monthName": "January",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 79",
      "Genesis / उत्पत्ति 27:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 28:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 53",
      "Isaiah / यशायाह 30:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-27": {
    "dateKey": "2026-01-27",
    "day": 27,
    "monthName": "January",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 82",
      "Genesis / उत्पत्ति 28:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 1:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 55",
      "Isaiah / यशायाह 31:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-28": {
    "dateKey": "2026-01-28",
    "day": 28,
    "monthName": "January",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 85",
      "Genesis / उत्पत्ति 29:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 2:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 57",
      "Isaiah / यशायाह 32:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-29": {
    "dateKey": "2026-01-29",
    "day": 29,
    "monthName": "January",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 88",
      "Genesis / उत्पत्ति 30:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 59",
      "Isaiah / यशायाह 33:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-30": {
    "dateKey": "2026-01-30",
    "day": 30,
    "monthName": "January",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 91",
      "Genesis / उत्पत्ति 31:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 61",
      "Isaiah / यशायाह 34:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-01-31": {
    "dateKey": "2026-01-31",
    "day": 31,
    "monthName": "January",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 94",
      "Genesis / उत्पत्ति 32:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 63",
      "Isaiah / यशायाह 35:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-01": {
    "dateKey": "2026-02-01",
    "day": 1,
    "monthName": "February",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "1th Sunday • Transfiguration & Lent",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 5",
      "Genesis / उत्पत्ति 3:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 4",
      "Isaiah / यशायाह 5:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 4:1–12",
      "Psalms / भजन संहिता 5",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 3:1–14",
      "*Gosp.** John / यूहन्ना 5:1–19"
    ]
  },
  "2026-02-02": {
    "dateKey": "2026-02-02",
    "day": 2,
    "monthName": "February",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 8",
      "Genesis / उत्पत्ति 4:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 6",
      "Isaiah / यशायाह 6:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-03": {
    "dateKey": "2026-02-03",
    "day": 3,
    "monthName": "February",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 11",
      "Genesis / उत्पत्ति 5:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 8",
      "Isaiah / यशायाह 7:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-04": {
    "dateKey": "2026-02-04",
    "day": 4,
    "monthName": "February",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 14",
      "Genesis / उत्पत्ति 6:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 6:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 10",
      "Isaiah / यशायाह 8:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-05": {
    "dateKey": "2026-02-05",
    "day": 5,
    "monthName": "February",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 17",
      "Genesis / उत्पत्ति 7:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 7:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 12",
      "Isaiah / यशायाह 9:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-06": {
    "dateKey": "2026-02-06",
    "day": 6,
    "monthName": "February",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 20",
      "Genesis / उत्पत्ति 8:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 8:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 14",
      "Isaiah / यशायाह 10:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-07": {
    "dateKey": "2026-02-07",
    "day": 7,
    "monthName": "February",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 23",
      "Genesis / उत्पत्ति 9:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 9:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 16",
      "Isaiah / यशायाह 11:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-08": {
    "dateKey": "2026-02-08",
    "day": 8,
    "monthName": "February",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "8th Sunday • Transfiguration & Lent",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 26",
      "Genesis / उत्पत्ति 10:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 10:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 18",
      "Isaiah / यशायाह 12:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 11:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 11:1–12",
      "Psalms / भजन संहिता 33",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 10:1–14",
      "*Gosp.** John / यूहन्ना 12:1–19"
    ]
  },
  "2026-02-09": {
    "dateKey": "2026-02-09",
    "day": 9,
    "monthName": "February",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 29",
      "Genesis / उत्पत्ति 11:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 11:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 20",
      "Isaiah / यशायाह 13:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 12:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-10": {
    "dateKey": "2026-02-10",
    "day": 10,
    "monthName": "February",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 32",
      "Genesis / उत्पत्ति 12:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 12:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22",
      "Isaiah / यशायाह 14:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 13:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-11": {
    "dateKey": "2026-02-11",
    "day": 11,
    "monthName": "February",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 35",
      "Genesis / उत्पत्ति 13:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 13:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 24",
      "Isaiah / यशायाह 15:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 14:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-12": {
    "dateKey": "2026-02-12",
    "day": 12,
    "monthName": "February",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 38",
      "Genesis / उत्पत्ति 14:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 14:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26",
      "Isaiah / यशायाह 16:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 15:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-13": {
    "dateKey": "2026-02-13",
    "day": 13,
    "monthName": "February",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 41",
      "Genesis / उत्पत्ति 15:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 15:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 28",
      "Isaiah / यशायाह 17:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 16:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-14": {
    "dateKey": "2026-02-14",
    "day": 14,
    "monthName": "February",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 44",
      "Genesis / उत्पत्ति 16:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 16:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 30",
      "Isaiah / यशायाह 18:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 17:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-15": {
    "dateKey": "2026-02-15",
    "day": 15,
    "monthName": "February",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "15th Sunday • Transfiguration & Lent",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 47",
      "Genesis / उत्पत्ति 17:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 17:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 32",
      "Isaiah / यशायाह 19:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 18:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 18:1–12",
      "Psalms / भजन संहिता 61",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 1:1–14",
      "*Gosp.** John / यूहन्ना 19:1–19"
    ]
  },
  "2026-02-16": {
    "dateKey": "2026-02-16",
    "day": 16,
    "monthName": "February",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 50",
      "Genesis / उत्पत्ति 18:1–14",
      "Romans / रोमियों 3:1–12",
      "Matthew / मत्ती 18:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 34",
      "Isaiah / यशायाह 20:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 19:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-17": {
    "dateKey": "2026-02-17",
    "day": 17,
    "monthName": "February",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 53",
      "Genesis / उत्पत्ति 19:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 19:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 36",
      "Isaiah / यशायाह 21:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 20:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-18": {
    "dateKey": "2026-02-18",
    "day": 18,
    "monthName": "February",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 56",
      "Genesis / उत्पत्ति 20:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 20:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 38",
      "Isaiah / यशायाह 22:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 21:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-19": {
    "dateKey": "2026-02-19",
    "day": 19,
    "monthName": "February",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 59",
      "Genesis / उत्पत्ति 21:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 21:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 40",
      "Isaiah / यशायाह 23:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 22:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-20": {
    "dateKey": "2026-02-20",
    "day": 20,
    "monthName": "February",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 62",
      "Genesis / उत्पत्ति 22:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 22:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 42",
      "Isaiah / यशायाह 24:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 23:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-21": {
    "dateKey": "2026-02-21",
    "day": 21,
    "monthName": "February",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 65",
      "Genesis / उत्पत्ति 23:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 23:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 44",
      "Isaiah / यशायाह 25:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 24:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-22": {
    "dateKey": "2026-02-22",
    "day": 22,
    "monthName": "February",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "22th Sunday • Transfiguration & Lent",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 68",
      "Genesis / उत्पत्ति 24:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 24:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 46",
      "Isaiah / यशायाह 26:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 1:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 25:1–12",
      "Psalms / भजन संहिता 89",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 8:1–14",
      "*Gosp.** John / यूहन्ना 5:1–19"
    ]
  },
  "2026-02-23": {
    "dateKey": "2026-02-23",
    "day": 23,
    "monthName": "February",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 71",
      "Genesis / उत्पत्ति 25:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 25:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 48",
      "Isaiah / यशायाह 27:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 2:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-24": {
    "dateKey": "2026-02-24",
    "day": 24,
    "monthName": "February",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 74",
      "Genesis / उत्पत्ति 26:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 26:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 50",
      "Isaiah / यशायाह 28:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 3:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-25": {
    "dateKey": "2026-02-25",
    "day": 25,
    "monthName": "February",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 77",
      "Genesis / उत्पत्ति 27:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 27:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 52",
      "Isaiah / यशायाह 29:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-26": {
    "dateKey": "2026-02-26",
    "day": 26,
    "monthName": "February",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 80",
      "Genesis / उत्पत्ति 28:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 28:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 54",
      "Isaiah / यशायाह 30:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-27": {
    "dateKey": "2026-02-27",
    "day": 27,
    "monthName": "February",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 83",
      "Genesis / उत्पत्ति 29:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 1:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 56",
      "Isaiah / यशायाह 31:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-02-28": {
    "dateKey": "2026-02-28",
    "day": 28,
    "monthName": "February",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 86",
      "Genesis / उत्पत्ति 30:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 2:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 58",
      "Isaiah / यशायाह 32:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-01": {
    "dateKey": "2026-03-01",
    "day": 1,
    "monthName": "March",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "1th Sunday • Lenten Journey & Passiontide",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 6",
      "Genesis / उत्पत्ति 4:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 5",
      "Isaiah / यशायाह 5:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 4:1–12",
      "Psalms / भजन संहिता 5",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 3:1–14",
      "*Gosp.** John / यूहन्ना 5:1–19"
    ]
  },
  "2026-03-02": {
    "dateKey": "2026-03-02",
    "day": 2,
    "monthName": "March",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 9",
      "Genesis / उत्पत्ति 5:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 7",
      "Isaiah / यशायाह 6:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-03": {
    "dateKey": "2026-03-03",
    "day": 3,
    "monthName": "March",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 12",
      "Genesis / उत्पत्ति 6:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 9",
      "Isaiah / यशायाह 7:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-04": {
    "dateKey": "2026-03-04",
    "day": 4,
    "monthName": "March",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 15",
      "Genesis / उत्पत्ति 7:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 6:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 11",
      "Isaiah / यशायाह 8:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-05": {
    "dateKey": "2026-03-05",
    "day": 5,
    "monthName": "March",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 18",
      "Genesis / उत्पत्ति 8:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 7:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 13",
      "Isaiah / यशायाह 9:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-06": {
    "dateKey": "2026-03-06",
    "day": 6,
    "monthName": "March",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 21",
      "Genesis / उत्पत्ति 9:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 8:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 15",
      "Isaiah / यशायाह 10:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-07": {
    "dateKey": "2026-03-07",
    "day": 7,
    "monthName": "March",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 24",
      "Genesis / उत्पत्ति 10:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 9:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 17",
      "Isaiah / यशायाह 11:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-08": {
    "dateKey": "2026-03-08",
    "day": 8,
    "monthName": "March",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "8th Sunday • Lenten Journey & Passiontide",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 27",
      "Genesis / उत्पत्ति 11:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 10:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 19",
      "Isaiah / यशायाह 12:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 11:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 11:1–12",
      "Psalms / भजन संहिता 33",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 10:1–14",
      "*Gosp.** John / यूहन्ना 12:1–19"
    ]
  },
  "2026-03-09": {
    "dateKey": "2026-03-09",
    "day": 9,
    "monthName": "March",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 30",
      "Genesis / उत्पत्ति 12:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 11:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 21",
      "Isaiah / यशायाह 13:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 12:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-10": {
    "dateKey": "2026-03-10",
    "day": 10,
    "monthName": "March",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 33",
      "Genesis / उत्पत्ति 13:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 12:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 23",
      "Isaiah / यशायाह 14:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 13:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-11": {
    "dateKey": "2026-03-11",
    "day": 11,
    "monthName": "March",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 36",
      "Genesis / उत्पत्ति 14:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 13:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 25",
      "Isaiah / यशायाह 15:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 14:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-12": {
    "dateKey": "2026-03-12",
    "day": 12,
    "monthName": "March",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 39",
      "Genesis / उत्पत्ति 15:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 14:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 27",
      "Isaiah / यशायाह 16:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 15:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-13": {
    "dateKey": "2026-03-13",
    "day": 13,
    "monthName": "March",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 42",
      "Genesis / उत्पत्ति 16:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 15:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 29",
      "Isaiah / यशायाह 17:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 16:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-14": {
    "dateKey": "2026-03-14",
    "day": 14,
    "monthName": "March",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 45",
      "Genesis / उत्पत्ति 17:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 16:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 31",
      "Isaiah / यशायाह 18:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 17:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-15": {
    "dateKey": "2026-03-15",
    "day": 15,
    "monthName": "March",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "15th Sunday • Lenten Journey & Passiontide",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 48",
      "Genesis / उत्पत्ति 18:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 17:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 33",
      "Isaiah / यशायाह 19:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 18:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 18:1–12",
      "Psalms / भजन संहिता 61",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 1:1–14",
      "*Gosp.** John / यूहन्ना 19:1–19"
    ]
  },
  "2026-03-16": {
    "dateKey": "2026-03-16",
    "day": 16,
    "monthName": "March",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 51",
      "Genesis / उत्पत्ति 19:1–14",
      "Romans / रोमियों 3:1–12",
      "Matthew / मत्ती 18:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 35",
      "Isaiah / यशायाह 20:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 19:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-17": {
    "dateKey": "2026-03-17",
    "day": 17,
    "monthName": "March",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 54",
      "Genesis / उत्पत्ति 20:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 19:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 37",
      "Isaiah / यशायाह 21:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 20:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-18": {
    "dateKey": "2026-03-18",
    "day": 18,
    "monthName": "March",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 57",
      "Genesis / उत्पत्ति 21:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 20:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 39",
      "Isaiah / यशायाह 22:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 21:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-19": {
    "dateKey": "2026-03-19",
    "day": 19,
    "monthName": "March",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 60",
      "Genesis / उत्पत्ति 22:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 21:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 41",
      "Isaiah / यशायाह 23:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 22:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-20": {
    "dateKey": "2026-03-20",
    "day": 20,
    "monthName": "March",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 63",
      "Genesis / उत्पत्ति 23:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 22:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 43",
      "Isaiah / यशायाह 24:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 23:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-21": {
    "dateKey": "2026-03-21",
    "day": 21,
    "monthName": "March",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 66",
      "Genesis / उत्पत्ति 24:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 23:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 45",
      "Isaiah / यशायाह 25:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 24:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-22": {
    "dateKey": "2026-03-22",
    "day": 22,
    "monthName": "March",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "22th Sunday • Lenten Journey & Passiontide",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 69",
      "Genesis / उत्पत्ति 25:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 24:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 47",
      "Isaiah / यशायाह 26:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 1:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 25:1–12",
      "Psalms / भजन संहिता 89",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 8:1–14",
      "*Gosp.** John / यूहन्ना 5:1–19"
    ]
  },
  "2026-03-23": {
    "dateKey": "2026-03-23",
    "day": 23,
    "monthName": "March",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 72",
      "Genesis / उत्पत्ति 26:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 25:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 49",
      "Isaiah / यशायाह 27:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 2:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-24": {
    "dateKey": "2026-03-24",
    "day": 24,
    "monthName": "March",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 75",
      "Genesis / उत्पत्ति 27:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 26:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 51",
      "Isaiah / यशायाह 28:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 3:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-25": {
    "dateKey": "2026-03-25",
    "day": 25,
    "monthName": "March",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 78",
      "Genesis / उत्पत्ति 28:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 27:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 53",
      "Isaiah / यशायाह 29:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-26": {
    "dateKey": "2026-03-26",
    "day": 26,
    "monthName": "March",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 81",
      "Genesis / उत्पत्ति 29:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 28:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 55",
      "Isaiah / यशायाह 30:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-27": {
    "dateKey": "2026-03-27",
    "day": 27,
    "monthName": "March",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 84",
      "Genesis / उत्पत्ति 30:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 1:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 57",
      "Isaiah / यशायाह 31:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-28": {
    "dateKey": "2026-03-28",
    "day": 28,
    "monthName": "March",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 87",
      "Genesis / उत्पत्ति 31:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 2:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 59",
      "Isaiah / यशायाह 32:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-29": {
    "dateKey": "2026-03-29",
    "day": 29,
    "monthName": "March",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "29th Sunday • Lenten Journey & Passiontide",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 90",
      "Genesis / उत्पत्ति 32:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 61",
      "Isaiah / यशायाह 33:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 32:1–12",
      "Psalms / भजन संहिता 117",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 15:1–14",
      "*Gosp.** John / यूहन्ना 12:1–19"
    ]
  },
  "2026-03-30": {
    "dateKey": "2026-03-30",
    "day": 30,
    "monthName": "March",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 93",
      "Genesis / उत्पत्ति 33:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 63",
      "Isaiah / यशायाह 34:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-03-31": {
    "dateKey": "2026-03-31",
    "day": 31,
    "monthName": "March",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Violet",
    "morningWorship": [
      "Psalms / भजन संहिता 96",
      "Genesis / उत्पत्ति 34:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 65",
      "Isaiah / यशायाह 35:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-01": {
    "dateKey": "2026-04-01",
    "day": 1,
    "monthName": "April",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 7",
      "Genesis / उत्पत्ति 5:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 6",
      "Isaiah / यशायाह 5:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-02": {
    "dateKey": "2026-04-02",
    "day": 2,
    "monthName": "April",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 10",
      "Genesis / उत्पत्ति 6:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 8",
      "Isaiah / यशायाह 6:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-03": {
    "dateKey": "2026-04-03",
    "day": 3,
    "monthName": "April",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 13",
      "Genesis / उत्पत्ति 7:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 10",
      "Isaiah / यशायाह 7:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-04": {
    "dateKey": "2026-04-04",
    "day": 4,
    "monthName": "April",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 16",
      "Genesis / उत्पत्ति 8:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 6:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 12",
      "Isaiah / यशायाह 8:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-05": {
    "dateKey": "2026-04-05",
    "day": 5,
    "monthName": "April",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "5th Sunday • Holy Week & Eastertide",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 19",
      "Genesis / उत्पत्ति 9:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 7:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 14",
      "Isaiah / यशायाह 9:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 8:1–12",
      "Psalms / भजन संहिता 21",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 7:1–14",
      "*Gosp.** John / यूहन्ना 9:1–19"
    ]
  },
  "2026-04-06": {
    "dateKey": "2026-04-06",
    "day": 6,
    "monthName": "April",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 22",
      "Genesis / उत्पत्ति 10:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 8:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 16",
      "Isaiah / यशायाह 10:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-07": {
    "dateKey": "2026-04-07",
    "day": 7,
    "monthName": "April",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 25",
      "Genesis / उत्पत्ति 11:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 9:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 18",
      "Isaiah / यशायाह 11:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-08": {
    "dateKey": "2026-04-08",
    "day": 8,
    "monthName": "April",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 28",
      "Genesis / उत्पत्ति 12:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 10:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 20",
      "Isaiah / यशायाह 12:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 11:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-09": {
    "dateKey": "2026-04-09",
    "day": 9,
    "monthName": "April",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 31",
      "Genesis / उत्पत्ति 13:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 11:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22",
      "Isaiah / यशायाह 13:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 12:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-10": {
    "dateKey": "2026-04-10",
    "day": 10,
    "monthName": "April",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 34",
      "Genesis / उत्पत्ति 14:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 12:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 24",
      "Isaiah / यशायाह 14:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 13:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-11": {
    "dateKey": "2026-04-11",
    "day": 11,
    "monthName": "April",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 37",
      "Genesis / उत्पत्ति 15:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 13:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26",
      "Isaiah / यशायाह 15:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 14:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-12": {
    "dateKey": "2026-04-12",
    "day": 12,
    "monthName": "April",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "12th Sunday • Holy Week & Eastertide",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 40",
      "Genesis / उत्पत्ति 16:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 14:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 28",
      "Isaiah / यशायाह 16:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 15:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 15:1–12",
      "Psalms / भजन संहिता 49",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 14:1–14",
      "*Gosp.** John / यूहन्ना 16:1–19"
    ]
  },
  "2026-04-13": {
    "dateKey": "2026-04-13",
    "day": 13,
    "monthName": "April",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 43",
      "Genesis / उत्पत्ति 17:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 15:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 30",
      "Isaiah / यशायाह 17:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 16:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-14": {
    "dateKey": "2026-04-14",
    "day": 14,
    "monthName": "April",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 46",
      "Genesis / उत्पत्ति 18:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 16:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 32",
      "Isaiah / यशायाह 18:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 17:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-15": {
    "dateKey": "2026-04-15",
    "day": 15,
    "monthName": "April",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 49",
      "Genesis / उत्पत्ति 19:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 17:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 34",
      "Isaiah / यशायाह 19:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 18:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-16": {
    "dateKey": "2026-04-16",
    "day": 16,
    "monthName": "April",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 52",
      "Genesis / उत्पत्ति 20:1–14",
      "Romans / रोमियों 3:1–12",
      "Matthew / मत्ती 18:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 36",
      "Isaiah / यशायाह 20:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 19:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-17": {
    "dateKey": "2026-04-17",
    "day": 17,
    "monthName": "April",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 55",
      "Genesis / उत्पत्ति 21:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 19:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 38",
      "Isaiah / यशायाह 21:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 20:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-18": {
    "dateKey": "2026-04-18",
    "day": 18,
    "monthName": "April",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 58",
      "Genesis / उत्पत्ति 22:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 20:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 40",
      "Isaiah / यशायाह 22:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 21:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-19": {
    "dateKey": "2026-04-19",
    "day": 19,
    "monthName": "April",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "19th Sunday • Holy Week & Eastertide",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 61",
      "Genesis / उत्पत्ति 23:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 21:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 42",
      "Isaiah / यशायाह 23:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 22:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 22:1–12",
      "Psalms / भजन संहिता 77",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 5:1–14",
      "*Gosp.** John / यूहन्ना 2:1–19"
    ]
  },
  "2026-04-20": {
    "dateKey": "2026-04-20",
    "day": 20,
    "monthName": "April",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 64",
      "Genesis / उत्पत्ति 24:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 22:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 44",
      "Isaiah / यशायाह 24:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 23:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-21": {
    "dateKey": "2026-04-21",
    "day": 21,
    "monthName": "April",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 67",
      "Genesis / उत्पत्ति 25:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 23:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 46",
      "Isaiah / यशायाह 25:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 24:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-22": {
    "dateKey": "2026-04-22",
    "day": 22,
    "monthName": "April",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 70",
      "Genesis / उत्पत्ति 26:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 24:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 48",
      "Isaiah / यशायाह 26:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 1:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-23": {
    "dateKey": "2026-04-23",
    "day": 23,
    "monthName": "April",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 73",
      "Genesis / उत्पत्ति 27:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 25:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 50",
      "Isaiah / यशायाह 27:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 2:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-24": {
    "dateKey": "2026-04-24",
    "day": 24,
    "monthName": "April",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 76",
      "Genesis / उत्पत्ति 28:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 26:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 52",
      "Isaiah / यशायाह 28:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 3:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-25": {
    "dateKey": "2026-04-25",
    "day": 25,
    "monthName": "April",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 79",
      "Genesis / उत्पत्ति 29:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 27:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 54",
      "Isaiah / यशायाह 29:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-26": {
    "dateKey": "2026-04-26",
    "day": 26,
    "monthName": "April",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "26th Sunday • Holy Week & Eastertide",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 82",
      "Genesis / उत्पत्ति 30:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 28:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 56",
      "Isaiah / यशायाह 30:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 29:1–12",
      "Psalms / भजन संहिता 105",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 12:1–14",
      "*Gosp.** John / यूहन्ना 9:1–19"
    ]
  },
  "2026-04-27": {
    "dateKey": "2026-04-27",
    "day": 27,
    "monthName": "April",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 85",
      "Genesis / उत्पत्ति 31:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 1:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 58",
      "Isaiah / यशायाह 31:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-28": {
    "dateKey": "2026-04-28",
    "day": 28,
    "monthName": "April",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 88",
      "Genesis / उत्पत्ति 32:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 2:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 60",
      "Isaiah / यशायाह 32:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-29": {
    "dateKey": "2026-04-29",
    "day": 29,
    "monthName": "April",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 91",
      "Genesis / उत्पत्ति 33:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 62",
      "Isaiah / यशायाह 33:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-04-30": {
    "dateKey": "2026-04-30",
    "day": 30,
    "monthName": "April",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 94",
      "Genesis / उत्पत्ति 34:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 64",
      "Isaiah / यशायाह 34:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-01": {
    "dateKey": "2026-05-01",
    "day": 1,
    "monthName": "May",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 8",
      "Genesis / उत्पत्ति 6:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 7",
      "Isaiah / यशायाह 5:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-02": {
    "dateKey": "2026-05-02",
    "day": 2,
    "monthName": "May",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 11",
      "Genesis / उत्पत्ति 7:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 9",
      "Isaiah / यशायाह 6:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-03": {
    "dateKey": "2026-05-03",
    "day": 3,
    "monthName": "May",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "3th Sunday • Ascension & Pentecost",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 14",
      "Genesis / उत्पत्ति 8:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 11",
      "Isaiah / यशायाह 7:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 6:1–12",
      "Psalms / भजन संहिता 13",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 5:1–14",
      "*Gosp.** John / यूहन्ना 7:1–19"
    ]
  },
  "2026-05-04": {
    "dateKey": "2026-05-04",
    "day": 4,
    "monthName": "May",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 17",
      "Genesis / उत्पत्ति 9:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 6:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 13",
      "Isaiah / यशायाह 8:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-05": {
    "dateKey": "2026-05-05",
    "day": 5,
    "monthName": "May",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 20",
      "Genesis / उत्पत्ति 10:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 7:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 15",
      "Isaiah / यशायाह 9:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-06": {
    "dateKey": "2026-05-06",
    "day": 6,
    "monthName": "May",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 23",
      "Genesis / उत्पत्ति 11:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 8:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 17",
      "Isaiah / यशायाह 10:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-07": {
    "dateKey": "2026-05-07",
    "day": 7,
    "monthName": "May",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 26",
      "Genesis / उत्पत्ति 12:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 9:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 19",
      "Isaiah / यशायाह 11:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-08": {
    "dateKey": "2026-05-08",
    "day": 8,
    "monthName": "May",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 29",
      "Genesis / उत्पत्ति 13:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 10:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 21",
      "Isaiah / यशायाह 12:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 11:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-09": {
    "dateKey": "2026-05-09",
    "day": 9,
    "monthName": "May",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 32",
      "Genesis / उत्पत्ति 14:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 11:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 23",
      "Isaiah / यशायाह 13:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 12:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-10": {
    "dateKey": "2026-05-10",
    "day": 10,
    "monthName": "May",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "10th Sunday • Ascension & Pentecost",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 35",
      "Genesis / उत्पत्ति 15:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 12:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 25",
      "Isaiah / यशायाह 14:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 13:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 13:1–12",
      "Psalms / भजन संहिता 41",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 12:1–14",
      "*Gosp.** John / यूहन्ना 14:1–19"
    ]
  },
  "2026-05-11": {
    "dateKey": "2026-05-11",
    "day": 11,
    "monthName": "May",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 38",
      "Genesis / उत्पत्ति 16:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 13:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 27",
      "Isaiah / यशायाह 15:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 14:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-12": {
    "dateKey": "2026-05-12",
    "day": 12,
    "monthName": "May",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 41",
      "Genesis / उत्पत्ति 17:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 14:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 29",
      "Isaiah / यशायाह 16:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 15:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-13": {
    "dateKey": "2026-05-13",
    "day": 13,
    "monthName": "May",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 44",
      "Genesis / उत्पत्ति 18:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 15:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 31",
      "Isaiah / यशायाह 17:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 16:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-14": {
    "dateKey": "2026-05-14",
    "day": 14,
    "monthName": "May",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 47",
      "Genesis / उत्पत्ति 19:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 16:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 33",
      "Isaiah / यशायाह 18:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 17:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-15": {
    "dateKey": "2026-05-15",
    "day": 15,
    "monthName": "May",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 50",
      "Genesis / उत्पत्ति 20:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 17:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 35",
      "Isaiah / यशायाह 19:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 18:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-16": {
    "dateKey": "2026-05-16",
    "day": 16,
    "monthName": "May",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 53",
      "Genesis / उत्पत्ति 21:1–14",
      "Romans / रोमियों 3:1–12",
      "Matthew / मत्ती 18:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 37",
      "Isaiah / यशायाह 20:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 19:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-17": {
    "dateKey": "2026-05-17",
    "day": 17,
    "monthName": "May",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "17th Sunday • Ascension & Pentecost",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 56",
      "Genesis / उत्पत्ति 22:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 19:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 39",
      "Isaiah / यशायाह 21:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 20:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 20:1–12",
      "Psalms / भजन संहिता 69",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 3:1–14",
      "*Gosp.** John / यूहन्ना 21:1–19"
    ]
  },
  "2026-05-18": {
    "dateKey": "2026-05-18",
    "day": 18,
    "monthName": "May",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 59",
      "Genesis / उत्पत्ति 23:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 20:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 41",
      "Isaiah / यशायाह 22:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 21:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-19": {
    "dateKey": "2026-05-19",
    "day": 19,
    "monthName": "May",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 62",
      "Genesis / उत्पत्ति 24:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 21:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 43",
      "Isaiah / यशायाह 23:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 22:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-20": {
    "dateKey": "2026-05-20",
    "day": 20,
    "monthName": "May",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 65",
      "Genesis / उत्पत्ति 25:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 22:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 45",
      "Isaiah / यशायाह 24:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 23:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-21": {
    "dateKey": "2026-05-21",
    "day": 21,
    "monthName": "May",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 68",
      "Genesis / उत्पत्ति 26:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 23:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 47",
      "Isaiah / यशायाह 25:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 24:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-22": {
    "dateKey": "2026-05-22",
    "day": 22,
    "monthName": "May",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 71",
      "Genesis / उत्पत्ति 27:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 24:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 49",
      "Isaiah / यशायाह 26:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 1:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-23": {
    "dateKey": "2026-05-23",
    "day": 23,
    "monthName": "May",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 74",
      "Genesis / उत्पत्ति 28:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 25:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 51",
      "Isaiah / यशायाह 27:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 2:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-24": {
    "dateKey": "2026-05-24",
    "day": 24,
    "monthName": "May",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "24th Sunday • Ascension & Pentecost",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 77",
      "Genesis / उत्पत्ति 29:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 26:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 53",
      "Isaiah / यशायाह 28:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 3:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 27:1–12",
      "Psalms / भजन संहिता 97",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 10:1–14",
      "*Gosp.** John / यूहन्ना 7:1–19"
    ]
  },
  "2026-05-25": {
    "dateKey": "2026-05-25",
    "day": 25,
    "monthName": "May",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 80",
      "Genesis / उत्पत्ति 30:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 27:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 55",
      "Isaiah / यशायाह 29:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-26": {
    "dateKey": "2026-05-26",
    "day": 26,
    "monthName": "May",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 83",
      "Genesis / उत्पत्ति 31:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 28:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 57",
      "Isaiah / यशायाह 30:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-27": {
    "dateKey": "2026-05-27",
    "day": 27,
    "monthName": "May",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 86",
      "Genesis / उत्पत्ति 32:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 1:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 59",
      "Isaiah / यशायाह 31:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-28": {
    "dateKey": "2026-05-28",
    "day": 28,
    "monthName": "May",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 89",
      "Genesis / उत्पत्ति 33:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 2:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 61",
      "Isaiah / यशायाह 32:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-29": {
    "dateKey": "2026-05-29",
    "day": 29,
    "monthName": "May",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 92",
      "Genesis / उत्पत्ति 34:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 63",
      "Isaiah / यशायाह 33:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-30": {
    "dateKey": "2026-05-30",
    "day": 30,
    "monthName": "May",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 95",
      "Genesis / उत्पत्ति 35:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 65",
      "Isaiah / यशायाह 34:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-05-31": {
    "dateKey": "2026-05-31",
    "day": 31,
    "monthName": "May",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "31th Sunday • Ascension & Pentecost",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 98",
      "Genesis / उत्पत्ति 36:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 67",
      "Isaiah / यशायाह 35:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 34:1–12",
      "Psalms / भजन संहिता 125",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 1:1–14",
      "*Gosp.** John / यूहन्ना 14:1–19"
    ]
  },
  "2026-06-01": {
    "dateKey": "2026-06-01",
    "day": 1,
    "monthName": "June",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 9",
      "Genesis / उत्पत्ति 7:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 8",
      "Isaiah / यशायाह 5:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-02": {
    "dateKey": "2026-06-02",
    "day": 2,
    "monthName": "June",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 12",
      "Genesis / उत्पत्ति 8:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 10",
      "Isaiah / यशायाह 6:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-03": {
    "dateKey": "2026-06-03",
    "day": 3,
    "monthName": "June",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 15",
      "Genesis / उत्पत्ति 9:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 5:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 12",
      "Isaiah / यशायाह 7:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-04": {
    "dateKey": "2026-06-04",
    "day": 4,
    "monthName": "June",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 18",
      "Genesis / उत्पत्ति 10:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 6:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 14",
      "Isaiah / यशायाह 8:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-05": {
    "dateKey": "2026-06-05",
    "day": 5,
    "monthName": "June",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 21",
      "Genesis / उत्पत्ति 11:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 7:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 16",
      "Isaiah / यशायाह 9:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-06": {
    "dateKey": "2026-06-06",
    "day": 6,
    "monthName": "June",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 24",
      "Genesis / उत्पत्ति 12:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 8:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 18",
      "Isaiah / यशायाह 10:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-07": {
    "dateKey": "2026-06-07",
    "day": 7,
    "monthName": "June",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "7th Sunday • Trinity & Kingdomtide",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 27",
      "Genesis / उत्पत्ति 13:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 9:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 20",
      "Isaiah / यशायाह 11:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 10:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 10:1–12",
      "Psalms / भजन संहिता 29",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 9:1–14",
      "*Gosp.** John / यूहन्ना 11:1–19"
    ]
  },
  "2026-06-08": {
    "dateKey": "2026-06-08",
    "day": 8,
    "monthName": "June",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 30",
      "Genesis / उत्पत्ति 14:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 10:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22",
      "Isaiah / यशायाह 12:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 11:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-09": {
    "dateKey": "2026-06-09",
    "day": 9,
    "monthName": "June",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 33",
      "Genesis / उत्पत्ति 15:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 11:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 24",
      "Isaiah / यशायाह 13:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 12:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-10": {
    "dateKey": "2026-06-10",
    "day": 10,
    "monthName": "June",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 36",
      "Genesis / उत्पत्ति 16:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 12:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26",
      "Isaiah / यशायाह 14:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 13:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-11": {
    "dateKey": "2026-06-11",
    "day": 11,
    "monthName": "June",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 39",
      "Genesis / उत्पत्ति 17:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 13:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 28",
      "Isaiah / यशायाह 15:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 14:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-12": {
    "dateKey": "2026-06-12",
    "day": 12,
    "monthName": "June",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 42",
      "Genesis / उत्पत्ति 18:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 14:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 30",
      "Isaiah / यशायाह 16:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 15:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-13": {
    "dateKey": "2026-06-13",
    "day": 13,
    "monthName": "June",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 45",
      "Genesis / उत्पत्ति 19:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 15:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 32",
      "Isaiah / यशायाह 17:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 16:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-14": {
    "dateKey": "2026-06-14",
    "day": 14,
    "monthName": "June",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "14th Sunday • Trinity & Kingdomtide",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 48",
      "Genesis / उत्पत्ति 20:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 16:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 34",
      "Isaiah / यशायाह 18:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 17:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 17:1–12",
      "Psalms / भजन संहिता 57",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 16:1–14",
      "*Gosp.** John / यूहन्ना 18:1–19"
    ]
  },
  "2026-06-15": {
    "dateKey": "2026-06-15",
    "day": 15,
    "monthName": "June",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 51",
      "Genesis / उत्पत्ति 21:1–14",
      "Romans / रोमियों 2:1–12",
      "Matthew / मत्ती 17:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 36",
      "Isaiah / यशायाह 19:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 18:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-16": {
    "dateKey": "2026-06-16",
    "day": 16,
    "monthName": "June",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 54",
      "Genesis / उत्पत्ति 22:1–14",
      "Romans / रोमियों 3:1–12",
      "Matthew / मत्ती 18:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 38",
      "Isaiah / यशायाह 20:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 19:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-17": {
    "dateKey": "2026-06-17",
    "day": 17,
    "monthName": "June",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 57",
      "Genesis / उत्पत्ति 23:1–14",
      "Romans / रोमियों 4:1–12",
      "Matthew / मत्ती 19:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 40",
      "Isaiah / यशायाह 21:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 20:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-18": {
    "dateKey": "2026-06-18",
    "day": 18,
    "monthName": "June",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 60",
      "Genesis / उत्पत्ति 24:1–14",
      "Romans / रोमियों 5:1–12",
      "Matthew / मत्ती 20:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 42",
      "Isaiah / यशायाह 22:1–11",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 21:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-19": {
    "dateKey": "2026-06-19",
    "day": 19,
    "monthName": "June",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 63",
      "Genesis / उत्पत्ति 25:1–14",
      "Romans / रोमियों 6:1–12",
      "Matthew / मत्ती 21:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 44",
      "Isaiah / यशायाह 23:1–11",
      "Hebrews / इब्रानियों 8:1–10",
      "Luke / लूका 22:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-20": {
    "dateKey": "2026-06-20",
    "day": 20,
    "monthName": "June",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 66",
      "Genesis / उत्पत्ति 26:1–14",
      "Romans / रोमियों 7:1–12",
      "Matthew / मत्ती 22:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 46",
      "Isaiah / यशायाह 24:1–11",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 23:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-21": {
    "dateKey": "2026-06-21",
    "day": 21,
    "monthName": "June",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "21th Sunday • Trinity & Kingdomtide",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 69",
      "Genesis / उत्पत्ति 27:1–14",
      "Romans / रोमियों 8:1–12",
      "Matthew / मत्ती 23:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 48",
      "Isaiah / यशायाह 25:1–11",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 24:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 24:1–12",
      "Psalms / भजन संहिता 85",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 7:1–14",
      "*Gosp.** John / यूहन्ना 4:1–19"
    ]
  },
  "2026-06-22": {
    "dateKey": "2026-06-22",
    "day": 22,
    "monthName": "June",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 72",
      "Genesis / उत्पत्ति 28:1–14",
      "Romans / रोमियों 9:1–12",
      "Matthew / मत्ती 24:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 50",
      "Isaiah / यशायाह 26:1–11",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 1:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-23": {
    "dateKey": "2026-06-23",
    "day": 23,
    "monthName": "June",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 75",
      "Genesis / उत्पत्ति 29:1–14",
      "Romans / रोमियों 10:1–12",
      "Matthew / मत्ती 25:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 52",
      "Isaiah / यशायाह 27:1–11",
      "Hebrews / इब्रानियों 12:1–10",
      "Luke / लूका 2:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-24": {
    "dateKey": "2026-06-24",
    "day": 24,
    "monthName": "June",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 78",
      "Genesis / उत्पत्ति 30:1–14",
      "Romans / रोमियों 11:1–12",
      "Matthew / मत्ती 26:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 54",
      "Isaiah / यशायाह 28:1–11",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 3:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-25": {
    "dateKey": "2026-06-25",
    "day": 25,
    "monthName": "June",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 81",
      "Genesis / उत्पत्ति 31:1–14",
      "Romans / रोमियों 12:1–12",
      "Matthew / मत्ती 27:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 56",
      "Isaiah / यशायाह 29:1–11",
      "Hebrews / इब्रानियों 1:1–10",
      "Luke / लूका 4:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-26": {
    "dateKey": "2026-06-26",
    "day": 26,
    "monthName": "June",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 84",
      "Genesis / उत्पत्ति 32:1–14",
      "Romans / रोमियों 13:1–12",
      "Matthew / मत्ती 28:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 58",
      "Isaiah / यशायाह 30:1–11",
      "Hebrews / इब्रानियों 2:1–10",
      "Luke / लूका 5:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-27": {
    "dateKey": "2026-06-27",
    "day": 27,
    "monthName": "June",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 87",
      "Genesis / उत्पत्ति 33:1–14",
      "Romans / रोमियों 14:1–12",
      "Matthew / मत्ती 1:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 60",
      "Isaiah / यशायाह 31:1–11",
      "Hebrews / इब्रानियों 3:1–10",
      "Luke / लूका 6:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-28": {
    "dateKey": "2026-06-28",
    "day": 28,
    "monthName": "June",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "28th Sunday • Trinity & Kingdomtide",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 90",
      "Genesis / उत्पत्ति 34:1–14",
      "Romans / रोमियों 15:1–12",
      "Matthew / मत्ती 2:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 62",
      "Isaiah / यशायाह 32:1–11",
      "Hebrews / इब्रानियों 4:1–10",
      "Luke / लूका 7:1–18"
    ],
    "lordsSupper": [
      "*OT** Exodus / निर्गमन 31:1–12",
      "Psalms / भजन संहिता 113",
      "*Epistle** 1 Corinthians / 1 कुरिन्थियों 14:1–14",
      "*Gosp.** John / यूहन्ना 11:1–19"
    ]
  },
  "2026-06-29": {
    "dateKey": "2026-06-29",
    "day": 29,
    "monthName": "June",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 93",
      "Genesis / उत्पत्ति 35:1–14",
      "Romans / रोमियों 16:1–12",
      "Matthew / मत्ती 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 64",
      "Isaiah / यशायाह 33:1–11",
      "Hebrews / इब्रानियों 5:1–10",
      "Luke / लूका 8:1–18"
    ],
    "lordsSupper": []
  },
  "2026-06-30": {
    "dateKey": "2026-06-30",
    "day": 30,
    "monthName": "June",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Daily Liturgical Reading",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 96",
      "Genesis / उत्पत्ति 36:1–14",
      "Romans / रोमियों 1:1–12",
      "Matthew / मत्ती 4:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 66",
      "Isaiah / यशायाह 34:1–11",
      "Hebrews / इब्रानियों 6:1–10",
      "Luke / लूका 9:1–18"
    ],
    "lordsSupper": []
  },
  "2026-07-01": {
    "dateKey": "2026-07-01",
    "day": 1,
    "monthName": "July",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 6",
      "2 Chronicles / 2 इतिहास 27:1–9",
      "James / याकूब 2:10–17",
      "Matthew / मत्ती 8:23–27"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 4",
      "2 Chronicles / 2 इतिहास 28:22—29:11",
      "James / याकूब 3:11–15",
      "Matthew / मत्ती 13:1–23"
    ],
    "lordsSupper": []
  },
  "2026-07-02": {
    "dateKey": "2026-07-02",
    "day": 2,
    "monthName": "July",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Visitation of Blessed Virgin Mary: John Newton of Punjab (Ev.) 1891",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 103:1–5",
      "1 Samuel / 1 शमूएल 2:1–10",
      "Galatians / गलतियों 4:1–5",
      "Luke / लूका 1:39–45"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 7:1–10",
      "2 Chronicles / 2 इतिहास 30:1–12",
      "Galatians / गलतियों 5:1–7",
      "Matthew / मत्ती 13:24–43"
    ],
    "lordsSupper": []
  },
  "2026-07-03": {
    "dateKey": "2026-07-03",
    "day": 3,
    "monthName": "July",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Indian Christian Day (St. Thomas Day or Yeshu Bhakti Divas)",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 96:1–10",
      "Isaiah / यशायाह 49:1–6",
      "2 Timothy / 2 तीमुथियुस 4:1–7",
      "John / यूहन्ना 20:20–29"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 10",
      "2 Chronicles / 2 इतिहास 31:20–32:15",
      "Ephesians / इफिसियों 1:20–23",
      "Matthew / मत्ती 13:44–58"
    ],
    "lordsSupper": []
  },
  "2026-07-04": {
    "dateKey": "2026-07-04",
    "day": 4,
    "monthName": "July",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 10:11–18",
      "2 Chronicles / 2 इतिहास 20:1–11",
      "Acts / प्रेरितों के काम 8:1–8",
      "Matthew / मत्ती 9:1–8"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 113:1–5",
      "2 Chronicles / 2 इतिहास 33:1–20",
      "Acts / प्रेरितों के काम 9:1–8",
      "Matthew / मत्ती 14:1–12"
    ],
    "lordsSupper": []
  },
  "2026-07-05": {
    "dateKey": "2026-07-05",
    "day": 5,
    "monthName": "July",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "6th Sunday after Pentecost — Rooted in Grace, Growing in Faith",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 24",
      "*OT** 1 Kings / 1 राजाओं 19:19–21",
      "*NT** Ephesians / इफिसियों 1:3–14",
      "and/or John / यूहन्ना 1:9–18"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 24",
      "*OT** 1 Kings / 1 राजाओं 19:19–21",
      "*NT** Ephesians / इफिसियों 1:3–14",
      "and/or John / यूहन्ना 1:9–18"
    ],
    "lordsSupper": [
      "*OT** 1 Samuel / 1 शमूएल 16:3–12",
      "Psalms / भजन संहिता 12",
      "Epistle 2 Corinthians / 2 कुरिन्थियों 12:1–10",
      "Gosp. Luke / लूका 17:5–10"
    ]
  },
  "2026-07-06": {
    "dateKey": "2026-07-06",
    "day": 6,
    "monthName": "July",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 13",
      "Isaiah / यशायाह 58:5–9",
      "James / याकूब 2:14–17",
      "Matthew / मत्ती 9:14–17"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 20 (om. v.8–12)",
      "2 Chronicles / 2 इतिहास 34:19-end",
      "James / याकूब 3:14–17",
      "Matthew / मत्ती 14:13-end"
    ],
    "lordsSupper": []
  },
  "2026-07-07": {
    "dateKey": "2026-07-07",
    "day": 7,
    "monthName": "July",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 15",
      "Jeremiah / यिर्मयाह 1:1–10",
      "Acts / प्रेरितों के काम 9:36–43",
      "Matthew / मत्ती 9:18–26"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 20 (om. v.8–12)",
      "Jeremiah / यिर्मयाह 1:11–19",
      "Acts / प्रेरितों के काम 10:36–43",
      "Matthew / मत्ती 15:1–20"
    ],
    "lordsSupper": []
  },
  "2026-07-08": {
    "dateKey": "2026-07-08",
    "day": 8,
    "monthName": "July",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 17",
      "Jeremiah / यिर्मयाह 2:1–10",
      "2 Corinthians / 2 कुरिन्थियों 4:1–6",
      "Matthew / मत्ती 9:27–31"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 23",
      "Jeremiah / यिर्मयाह 2:14–32",
      "2 Corinthians / 2 कुरिन्थियों 5:1–10",
      "Matthew / मत्ती 15:21-end"
    ],
    "lordsSupper": []
  },
  "2026-07-09": {
    "dateKey": "2026-07-09",
    "day": 9,
    "monthName": "July",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Ziegenbalg and Pluetschau (Ev.) Tranquebar, 1706",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 18:14–25",
      "1 Chronicles / 1 इतिहास 16:7–15",
      "Colossians / कुलुस्सियों 1:11–14",
      "Matthew / मत्ती 9:32–34"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26, 27",
      "Jeremiah / यिर्मयाह 3:6–20",
      "Colossians / कुलुस्सियों 1:15–23",
      "Matthew / मत्ती 16:1–12"
    ],
    "lordsSupper": []
  },
  "2026-07-10": {
    "dateKey": "2026-07-10",
    "day": 10,
    "monthName": "July",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 18:39–50",
      "Ezekiel / यहेजकेल 134:1–6",
      "2 Thessalonians / 2 थिस्सलुनीकियों 3:1–5",
      "Matthew / मत्ती 9:35–38"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 31",
      "Jeremiah / यिर्मयाह 4:11-end",
      "2 Thessalonians / 2 थिस्सलुनीकियों 3:6–18",
      "Matthew / मत्ती 16:13-end"
    ],
    "lordsSupper": []
  },
  "2026-07-11": {
    "dateKey": "2026-07-11",
    "day": 11,
    "monthName": "July",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 20",
      "Deuteronomy / व्यवस्थाविवरण 10:12–16",
      "Acts / प्रेरितों के काम 5:12–16",
      "Matthew / मत्ती 10:1–4"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 33",
      "Jeremiah / यिर्मयाह 5:15-end",
      "Acts / प्रेरितों के काम 6:10–16",
      "Matthew / मत्ती 17:1–21"
    ],
    "lordsSupper": []
  },
  "2026-07-12": {
    "dateKey": "2026-07-12",
    "day": 12,
    "monthName": "July",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "7th Sunday after Pentecost — Bearing Fruit for the Kingdom",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 1",
      "*OT** Deuteronomy / व्यवस्थाविवरण 10:12–22",
      "*NT** James / याकूब 3:13–18",
      "and/or Matthew / मत्ती 7:15–22"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 1",
      "*OT** Deuteronomy / व्यवस्थाविवरण 10:12–22",
      "*NT** James / याकूब 3:13–18",
      "and/or Matthew / मत्ती 7:15–22"
    ],
    "lordsSupper": [
      "*OT** Jeremiah / यिर्मयाह 17:1–8",
      "Psalms / भजन संहिता 15",
      "Epistle Galatians / गलतियों 5:20–23",
      "Gosp. Matthew / मत्ती 3:7–12"
    ]
  },
  "2026-07-13": {
    "dateKey": "2026-07-13",
    "day": 13,
    "monthName": "July",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Silas Companion of St. Paul",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 23",
      "Deuteronomy / व्यवस्थाविवरण 26:16–19",
      "Acts / प्रेरितों के काम 15:36–41",
      "Matthew / मत्ती 10:16–23"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 37:12–41",
      "Jeremiah / यिर्मयाह 6:16-end",
      "Acts / प्रेरितों के काम 15:1–20",
      "Matthew / मत्ती 17:22–18:14"
    ],
    "lordsSupper": []
  },
  "2026-07-14": {
    "dateKey": "2026-07-14",
    "day": 14,
    "monthName": "July",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 25",
      "Joshua / यहोशू 8:1–3",
      "Hebrews / इब्रानियों 13:5–6",
      "Matthew / मत्ती 10:26–33"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 39",
      "Jeremiah / यिर्मयाह 7:21—8:3",
      "Hebrews / इब्रानियों 12:1–10",
      "Matthew / मत्ती 18:15-end"
    ],
    "lordsSupper": []
  },
  "2026-07-15": {
    "dateKey": "2026-07-15",
    "day": 15,
    "monthName": "July",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 27",
      "Exodus / निर्गमन 20:4–6",
      "2 Timothy / 2 तीमुथियुस 3:1–9",
      "Matthew / मत्ती 10:34–42"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 41",
      "Jeremiah / यिर्मयाह 8:18—9:11",
      "2 Timothy / 2 तीमुथियुस 3:10–17",
      "Matthew / मत्ती 19:1–15"
    ],
    "lordsSupper": []
  },
  "2026-07-16": {
    "dateKey": "2026-07-16",
    "day": 16,
    "monthName": "July",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 29",
      "Isaiah / यशायाह 35:5–10",
      "Acts / प्रेरितों के काम 3:1–10",
      "Matthew / मत्ती 11:2–10"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 44",
      "Jeremiah / यिर्मयाह 10:1–10, 19-end",
      "Acts / प्रेरितों के काम 4:1–10",
      "Matthew / मत्ती 19:16-end"
    ],
    "lordsSupper": []
  },
  "2026-07-17": {
    "dateKey": "2026-07-17",
    "day": 17,
    "monthName": "July",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 31",
      "Malachi / मलाकी 4:4–6",
      "James / याकूब 5:17–20",
      "Matthew / मत्ती 11:11–15"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 46, 47",
      "Jeremiah / यिर्मयाह 11:18—12:4",
      "James / याकूब 4:11– end",
      "Matthew / मत्ती 20:1–16"
    ],
    "lordsSupper": []
  },
  "2026-07-18": {
    "dateKey": "2026-07-18",
    "day": 18,
    "monthName": "July",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 33",
      "Isaiah / यशायाह 53:8",
      "Philippians / फिलिप्पियों 2:14–16",
      "Matthew / मत्ती 11:16–19"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 49",
      "Jeremiah / यिर्मयाह 13:1–14",
      "Philippians / फिलिप्पियों 3:10–16",
      "Matthew / मत्ती 20:17-end"
    ],
    "lordsSupper": []
  },
  "2026-07-19": {
    "dateKey": "2026-07-19",
    "day": 19,
    "monthName": "July",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "8th Sunday after Pentecost — Living Wisely in God's Spirit",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 51:1–12",
      "*OT** Isaiah / यशायाह 11:1–10",
      "*NT** Acts / प्रेरितों के काम 8:14–17",
      "and/or Luke / लूका 3:18–22"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 51:1–12",
      "*OT** Isaiah / यशायाह 11:1–10",
      "*NT** Acts / प्रेरितों के काम 8:14–17",
      "and/or Luke / लूका 3:18–22"
    ],
    "lordsSupper": [
      "*OT** Zechariah / जकर्याह 4:1–9",
      "Psalms / भजन संहिता 35:18–28",
      "Epistle Acts / प्रेरितों के काम 19:1–7",
      "Gosp. Luke / लूका 11:5–13"
    ]
  },
  "2026-07-20": {
    "dateKey": "2026-07-20",
    "day": 20,
    "monthName": "July",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 36",
      "Isaiah / यशायाह 1:10–17",
      "1 Peter / 1 पतरस 2:1–5",
      "Matthew / मत्ती 12:1–8"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 53, 54 (om. v.5)",
      "Jeremiah / यिर्मयाह 14:1–16",
      "1 Peter / 1 पतरस 2:11–23",
      "Matthew / मत्ती 21:1–17"
    ],
    "lordsSupper": []
  },
  "2026-07-21": {
    "dateKey": "2026-07-21",
    "day": 21,
    "monthName": "July",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 37:12–23",
      "Micah / मीका 6:6–8",
      "Titus / तीतुस 3:4–7",
      "Matthew / मत्ती 12:9–13"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 56",
      "Jeremiah / यिर्मयाह 15:10-end",
      "Titus / तीतुस 2:1–7",
      "Matthew / मत्ती 21:18–32"
    ],
    "lordsSupper": []
  },
  "2026-07-22": {
    "dateKey": "2026-07-22",
    "day": 22,
    "monthName": "July",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Martha and Mary of Bethany",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 37:29–40",
      "Isaiah / यशायाह 60:18–22",
      "1 Peter / 1 पतरस 4:1–6",
      "Mark / मरकुस 16:1–8"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 38",
      "Isaiah / यशायाह 60:18–22",
      "1 Peter / 1 पतरस 4:7–19",
      "John / यूहन्ना 20:11–18"
    ],
    "lordsSupper": []
  },
  "2026-07-23": {
    "dateKey": "2026-07-23",
    "day": 23,
    "monthName": "July",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 39",
      "Numbers / गिनती 27:18–23",
      "1 Corinthians / 1 कुरिन्थियों 1:10–17",
      "Matthew / मत्ती 12:22–37"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 64",
      "Jeremiah / यिर्मयाह 16:19–17:11",
      "1 Corinthians / 1 कुरिन्थियों 2:10–15",
      "Matthew / मत्ती 21:33-end"
    ],
    "lordsSupper": []
  },
  "2026-07-24": {
    "dateKey": "2026-07-24",
    "day": 24,
    "monthName": "July",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 41",
      "Numbers / गिनती 14:20–24",
      "1 Corinthians / 1 कुरिन्थियों 1:22–25",
      "Matthew / मत्ती 12:38–42"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 66, 67",
      "Jeremiah / यिर्मयाह 18:1–17",
      "Romans / रोमियों 11:1–3",
      "Matthew / मत्ती 22:1–14"
    ],
    "lordsSupper": []
  },
  "2026-07-25": {
    "dateKey": "2026-07-25",
    "day": 25,
    "monthName": "July",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "St. James, Apostle, Martyr",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 43",
      "Ezekiel / यहेजकेल 34:11–16",
      "Acts / प्रेरितों के काम 12:1–5",
      "Mark / मरकुस 1:16–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 44",
      "Ezekiel / यहेजकेल 34:17–23",
      "Acts / प्रेरितों के काम 12:6–11",
      "Matthew / मत्ती 22:1–14"
    ],
    "lordsSupper": []
  },
  "2026-07-26": {
    "dateKey": "2026-07-26",
    "day": 26,
    "monthName": "July",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "9th Sunday after Pentecost — God's Covenant and unifying peace of Christ",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 45",
      "*OT** Genesis / उत्पत्ति 9:8–17",
      "*NT** Ephesians / इफिसियों 2:11–22",
      "and/or John / यूहन्ना 10:14–18"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 45",
      "*OT** Genesis / उत्पत्ति 9:8–17",
      "*NT** Ephesians / इफिसियों 2:11–22",
      "and/or John / यूहन्ना 10:14–18"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह 52:7–12",
      "Psalms / भजन संहिता 45",
      "Epistle Acts / प्रेरितों के काम 10:34–43",
      "Gosp. John / यूहन्ना 17:11–23"
    ]
  },
  "2026-07-27": {
    "dateKey": "2026-07-27",
    "day": 27,
    "monthName": "July",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 46",
      "Micah / मीका 4:1–5",
      "Romans / रोमियों 6:20–23",
      "Matthew / मत्ती 13:24–30"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 73",
      "Jeremiah / यिर्मयाह 19",
      "Romans / रोमियों 7:1–7",
      "Matthew / मत्ती 22:15–33"
    ],
    "lordsSupper": []
  },
  "2026-07-28": {
    "dateKey": "2026-07-28",
    "day": 28,
    "monthName": "July",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 48",
      "Jeremiah / यिर्मयाह 20:1–10",
      "1 Corinthians / 1 कुरिन्थियों 3:5–8",
      "Matthew / मत्ती 13:31–35"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 75",
      "Jeremiah / यिर्मयाह 21",
      "1 Corinthians / 1 कुरिन्थियों 3:10–17",
      "Matthew / मत्ती 22:34–23:12"
    ],
    "lordsSupper": []
  },
  "2026-07-29": {
    "dateKey": "2026-07-29",
    "day": 29,
    "monthName": "July",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Martha and Mary of Bethany",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 50",
      "2 Samuel / 2 शमूएल 16:17–19",
      "Romans / रोमियों 12:9–13",
      "Luke / लूका 10:38–42"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 77",
      "Jeremiah / यिर्मयाह 22:13-end",
      "Romans / रोमियों 12:14–21",
      "Matthew / मत्ती 23:13–36"
    ],
    "lordsSupper": []
  },
  "2026-07-30": {
    "dateKey": "2026-07-30",
    "day": 30,
    "monthName": "July",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 52",
      "Isaiah / यशायाह 52:1–5",
      "1 Corinthians / 1 कुरिन्थियों 7:17–24",
      "Matthew / मत्ती 13:44–52"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 78:17–40",
      "Jeremiah / यिर्मयाह 23:16-end",
      "1 Corinthians / 1 कुरिन्थियों 7:25–35",
      "Matthew / मत्ती 23:37–24:14"
    ],
    "lordsSupper": []
  },
  "2026-07-31": {
    "dateKey": "2026-07-31",
    "day": 31,
    "monthName": "July",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Ignatius of Loyola (Monk Ev.) 1556",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 54",
      "Genesis / उत्पत्ति 32:22–31",
      "1 Timothy / 1 तीमुथियुस 6:11–16",
      "Matthew / मत्ती 14:13–21"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 78:56–72",
      "Jeremiah / यिर्मयाह 25:1–14",
      "1 Timothy / 1 तीमुथियुस 6:17–20",
      "Matthew / मत्ती 24:15–35",
      "# **AUGUST 2026**"
    ],
    "lordsSupper": []
  },
  "2026-08-01": {
    "dateKey": "2026-08-01",
    "day": 1,
    "monthName": "August",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 34:1–8",
      "Exodus / निर्गमन 24:12–18",
      "Acts / प्रेरितों के काम 12:1–17",
      "Matthew / मत्ती 16:13–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 34:9–22",
      "2 Kings / 2 राजाओं 2:1–15",
      "2 Peter / 2 पतरस 1:16–21",
      "John / यूहन्ना 21:15–19"
    ],
    "lordsSupper": []
  },
  "2026-08-02": {
    "dateKey": "2026-08-02",
    "day": 2,
    "monthName": "August",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "10th Sunday after Pentecost — God's Abundant Grace and compassion for all",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 145:8–9, 14–21",
      "*OT** Isaiah / यशायाह 55:1–5",
      "*NT** Romans / रोमियों 9:1–5",
      "and/or Matthew / मत्ती 14:13–21"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 145:8–9, 14–21",
      "*OT** Isaiah / यशायाह 55:1–5",
      "*NT** Romans / रोमियों 9:1–5",
      "and/or Matthew / मत्ती 14:13–21"
    ],
    "lordsSupper": [
      "*OT** Genesis / उत्पत्ति 32:22–31",
      "Psalms / भजन संहिता 17:1–7, 15",
      "Epistle Romans / रोमियों 9:6–13",
      "Gosp. Matthew / मत्ती 14:22–33"
    ]
  },
  "2026-08-03": {
    "dateKey": "2026-08-03",
    "day": 3,
    "monthName": "August",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 5",
      "Judges / न्यायियों 6:11–24",
      "1 Corinthians / 1 कुरिन्थियों 2:1–10",
      "Matthew / मत्ती 6:1–6"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 6",
      "Judges / न्यायियों 6:25–40",
      "1 Corinthians / 1 कुरिन्थियों 2:11–16",
      "Matthew / मत्ती 6:7–15"
    ],
    "lordsSupper": []
  },
  "2026-08-04": {
    "dateKey": "2026-08-04",
    "day": 4,
    "monthName": "August",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Commemoration: Dominic (Monk, Evangelist) – 1221",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 15",
      "Judges / न्यायियों 7:1–18",
      "1 Corinthians / 1 कुरिन्थियों 3:1–9",
      "Matthew / मत्ती 6:16–24"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 16",
      "Judges / न्यायियों 7:19–8:12",
      "1 Corinthians / 1 कुरिन्थियों 3:10–17",
      "Matthew / मत्ती 6:25–34"
    ],
    "lordsSupper": []
  },
  "2026-08-05": {
    "dateKey": "2026-08-05",
    "day": 5,
    "monthName": "August",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 119:1–24",
      "Judges / न्यायियों 8:22–35",
      "1 Corinthians / 1 कुरिन्थियों 3:18–23",
      "Matthew / मत्ती 7:1–14"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 119:25–48",
      "Judges / न्यायियों 9:1–21",
      "1 Corinthians / 1 कुरिन्थियों 4:1–7",
      "Matthew / मत्ती 7:15–29"
    ],
    "lordsSupper": []
  },
  "2026-08-06": {
    "dateKey": "2026-08-06",
    "day": 6,
    "monthName": "August",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Feast: The Transfiguration of Jesus Christ",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 97",
      "Exodus / निर्गमन 34:29–35",
      "2 Peter / 2 पतरस 1:13–21",
      "Luke / लूका 9:28–36"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 99",
      "Daniel / दानिय्येल 7:9–10, 13–14",
      "Revelation / प्रकाशितवाक्य 1:1–8",
      "Luke / लूका 9:28–36"
    ],
    "lordsSupper": []
  },
  "2026-08-07": {
    "dateKey": "2026-08-07",
    "day": 7,
    "monthName": "August",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Commemoration: The Holy Name of Jesus",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 8",
      "Isaiah / यशायाह 9:1–7",
      "Philippians / फिलिप्पियों 2:5–11",
      "Luke / लूका 2:15–21"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 20",
      "Isaiah / यशायाह 52:1–12",
      "Acts / प्रेरितों के काम 4:5–12",
      "John / यूहन्ना 16:23–28"
    ],
    "lordsSupper": []
  },
  "2026-08-08": {
    "dateKey": "2026-08-08",
    "day": 8,
    "monthName": "August",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 18:1–19",
      "Judges / न्यायियों 9:22–57",
      "1 Corinthians / 1 कुरिन्थियों 4:8–13",
      "Matthew / मत्ती 8:1–17"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 18:20–50",
      "Judges / न्यायियों 10:1–18",
      "1 Corinthians / 1 कुरिन्थियों 4:14–21",
      "Matthew / मत्ती 8:18–27"
    ],
    "lordsSupper": []
  },
  "2026-08-09": {
    "dateKey": "2026-08-09",
    "day": 9,
    "monthName": "August",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "11th Sunday after Pentecost — World Tribal Day — Faith in the Midst of Fear and the Presence of Christ in the Storm",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 85:8–13",
      "*OT** Exodus / निर्गमन 14:15–25",
      "*NT** Acts / प्रेरितों के काम 27:27–40",
      "and/or Mark / मरकुस 4:35–41"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 85:8–13",
      "*OT** Exodus / निर्गमन 14:15–25",
      "*NT** Acts / प्रेरितों के काम 27:27–40",
      "and/or Mark / मरकुस 4:35–41"
    ],
    "lordsSupper": [
      "*OT** Genesis / उत्पत्ति 37:1–4, 12–28",
      "Psalms / भजन संहिता 105:1–6, 16–22, 45b",
      "Epistle 1 Peter / 1 पतरस 4:12–16",
      "Gosp. Mark / मरकुस 6:45–52"
    ]
  },
  "2026-08-10": {
    "dateKey": "2026-08-10",
    "day": 10,
    "monthName": "August",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 25",
      "Judges / न्यायियों 11:1–11",
      "1 Corinthians / 1 कुरिन्थियों 5:1–8",
      "Matthew / मत्ती 8:28–34"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26",
      "Judges / न्यायियों 11:12–28",
      "1 Corinthians / 1 कुरिन्थियों 5:9–13",
      "Matthew / मत्ती 9:1–8"
    ],
    "lordsSupper": []
  },
  "2026-08-11": {
    "dateKey": "2026-08-11",
    "day": 11,
    "monthName": "August",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 28",
      "Judges / न्यायियों 11:29–40",
      "1 Corinthians / 1 कुरिन्थियों 6:1–11",
      "Matthew / मत्ती 9:9–17"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 29",
      "Judges / न्यायियों 12:1–15",
      "1 Corinthians / 1 कुरिन्थियों 6:12–20",
      "Matthew / मत्ती 9:18–26"
    ],
    "lordsSupper": []
  },
  "2026-08-12": {
    "dateKey": "2026-08-12",
    "day": 12,
    "monthName": "August",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Commemoration: Clare of Assisi (Nun) – 1253",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 31",
      "Judges / न्यायियों 13:1–25",
      "1 Corinthians / 1 कुरिन्थियों 7:1–9",
      "Matthew / मत्ती 9:27–34"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 32",
      "Judges / न्यायियों 14:1–20",
      "1 Corinthians / 1 कुरिन्थियों 7:10–24",
      "Matthew / मत्ती 9:35–10:4"
    ],
    "lordsSupper": []
  },
  "2026-08-13": {
    "dateKey": "2026-08-13",
    "day": 13,
    "monthName": "August",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 33",
      "Judges / न्यायियों 15:1–20",
      "1 Corinthians / 1 कुरिन्थियों 7:25–31",
      "Matthew / मत्ती 10:5–15"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 34",
      "Judges / न्यायियों 16:1–31",
      "1 Corinthians / 1 कुरिन्थियों 7:32–40",
      "Matthew / मत्ती 10:16–23"
    ],
    "lordsSupper": []
  },
  "2026-08-14": {
    "dateKey": "2026-08-14",
    "day": 14,
    "monthName": "August",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 35",
      "Ruth / रूत 1:1–22",
      "1 Corinthians / 1 कुरिन्थियों 8:1–13",
      "Matthew / मत्ती 10:24–33"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 36",
      "Ruth / रूत 2:1–23",
      "1 Corinthians / 1 कुरिन्थियों 9:1–12",
      "Matthew / मत्ती 10:34–42"
    ],
    "lordsSupper": []
  },
  "2026-08-15": {
    "dateKey": "2026-08-15",
    "day": 15,
    "monthName": "August",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Independence Day: The Founders of the Nation",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 33",
      "Deuteronomy / व्यवस्थाविवरण 8:11–20",
      "Hebrews / इब्रानियों 11:8–16",
      "Matthew / मत्ती 10:32–43"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 46",
      "Isaiah / यशायाह 58:6–12",
      "1 Peter / 1 पतरस 2:9–17",
      "John / यूहन्ना 8:31–36"
    ],
    "lordsSupper": []
  },
  "2026-08-16": {
    "dateKey": "2026-08-16",
    "day": 16,
    "monthName": "August",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "12th Sunday after Pentecost — God's Mercy Extends to All People",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 133",
      "*OT** 1 Kings / 1 राजाओं 19:9–18",
      "*NT** Romans / रोमियों 11:1–2a, 29–32",
      "and/or John / यूहन्ना 10:11–18"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 133",
      "*OT** 1 Kings / 1 राजाओं 19:9–18",
      "*NT** Romans / रोमियों 11:1–2a, 29–32",
      "and/or John / यूहन्ना 10:11–18"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह 56:1–8",
      "Psalms / भजन संहिता 67",
      "Epistle Romans / रोमियों 11:1–7",
      "Gosp. Matthew / मत्ती 15:21–28"
    ]
  },
  "2026-08-17": {
    "dateKey": "2026-08-17",
    "day": 17,
    "monthName": "August",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 87",
      "Genesis / उत्पत्ति 43:1–15",
      "1 Corinthians / 1 कुरिन्थियों 7:25–31",
      "Matthew / मत्ती 6:1–6"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 88",
      "Genesis / उत्पत्ति 43:16–34",
      "1 Corinthians / 1 कुरिन्थियों 7:32–40",
      "Matthew / मत्ती 6:7–15"
    ],
    "lordsSupper": []
  },
  "2026-08-18": {
    "dateKey": "2026-08-18",
    "day": 18,
    "monthName": "August",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 89:1–18",
      "Genesis / उत्पत्ति 44:1–17",
      "1 Corinthians / 1 कुरिन्थियों 8:1–13",
      "Matthew / मत्ती 6:1–6"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 88",
      "Genesis / उत्पत्ति 43:16–34",
      "1 Corinthians / 1 कुरिन्थियों 7:32–40",
      "Matthew / मत्ती 6:16–24"
    ],
    "lordsSupper": []
  },
  "2026-08-19": {
    "dateKey": "2026-08-19",
    "day": 19,
    "monthName": "August",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 90",
      "Genesis / उत्पत्ति 45:1–15",
      "1 Corinthians / 1 कुरिन्थियों 9:16–27",
      "Matthew / मत्ती 7:1–12"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 91",
      "Genesis / उत्पत्ति 45:16–28",
      "1 Corinthians / 1 कुरिन्थियों 10:1–13",
      "Matthew / मत्ती 7:13–21"
    ],
    "lordsSupper": []
  },
  "2026-08-20": {
    "dateKey": "2026-08-20",
    "day": 20,
    "monthName": "August",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Commemoration: Bernard of Clairvaux (Monk, Theologian) – 1153",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 92",
      "Genesis / उत्पत्ति 46:1–27",
      "1 Corinthians / 1 कुरिन्थियों 10:14–11:1",
      "Matthew / मत्ती 7:22–29"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 93",
      "Genesis / उत्पत्ति 46:28–47:12",
      "1 Corinthians / 1 कुरिन्थियों 11:2–16",
      "Matthew / मत्ती 8:1–17"
    ],
    "lordsSupper": []
  },
  "2026-08-21": {
    "dateKey": "2026-08-21",
    "day": 21,
    "monthName": "August",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 94",
      "Genesis / उत्पत्ति 47:13–31",
      "1 Corinthians / 1 कुरिन्थियों 11:17–34",
      "Matthew / मत्ती 8:18–27"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 95",
      "Genesis / उत्पत्ति 48:1–22",
      "1 Corinthians / 1 कुरिन्थियों 12:1–11",
      "Matthew / मत्ती 8:28–34"
    ],
    "lordsSupper": []
  },
  "2026-08-22": {
    "dateKey": "2026-08-22",
    "day": 22,
    "monthName": "August",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 96",
      "Genesis / उत्पत्ति 49:1–28",
      "1 Corinthians / 1 कुरिन्थियों 12:31",
      "Matthew / मत्ती 9:1–17"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 97",
      "Genesis / उत्पत्ति 49:29–50:14",
      "1 Corinthians / 1 कुरिन्थियों 13:1–13",
      "Matthew / मत्ती 9:18–26"
    ],
    "lordsSupper": []
  },
  "2026-08-23": {
    "dateKey": "2026-08-23",
    "day": 23,
    "monthName": "August",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "13th Sunday after Pentecost — The Church Built on the Rock of Christ",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 138",
      "*OT** Exodus / निर्गमन 1:8–2:10",
      "*NT** Ephesians / इफिसियों 4:11–16",
      "and/or Matthew / मत्ती 16:13–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 138",
      "*OT** Exodus / निर्गमन 1:8–2:10",
      "*NT** Ephesians / इफिसियों 4:11–16",
      "and/or Matthew / मत्ती 16:13–20"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह 51:1–6",
      "Psalms / भजन संहिता 124",
      "Epistle 1 Peter / 1 पतरस 2:1–10",
      "Gosp. Matthew / मत्ती 16:13–20"
    ]
  },
  "2026-08-24": {
    "dateKey": "2026-08-24",
    "day": 24,
    "monthName": "August",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Feast: St. Bartholomew, Apostle and Martyr",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 91",
      "Deuteronomy / व्यवस्थाविवरण 18:15–18",
      "1 Corinthians / 1 कुरिन्थियों 4:9–15",
      "Luke / लूका 22:24–30"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 97",
      "Isaiah / यशायाह 66:1–2",
      "1 Peter / 1 पतरस 5:1–4",
      "John / यूहन्ना 1:43–51"
    ],
    "lordsSupper": []
  },
  "2026-08-25": {
    "dateKey": "2026-08-25",
    "day": 25,
    "monthName": "August",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 98",
      "Exodus / निर्गमन 2:11–25",
      "1 Corinthians / 1 कुरिन्थियों 14:1–19",
      "Matthew / मत्ती 9:27–34"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 99",
      "Exodus / निर्गमन 3:1–12",
      "1 Corinthians / 1 कुरिन्थियों 14:20–40",
      "Matthew / मत्ती 9:35–10:4"
    ],
    "lordsSupper": []
  },
  "2026-08-26": {
    "dateKey": "2026-08-26",
    "day": 26,
    "monthName": "August",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 100",
      "Exodus / निर्गमन 3:13–22",
      "1 Corinthians / 1 कुरिन्थियों 15:1–11",
      "Matthew / मत्ती 10:5–15"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 101",
      "Exodus / निर्गमन 4:1–23",
      "1 Corinthians / 1 कुरिन्थियों 15:12–34",
      "Matthew / मत्ती 10:16–23"
    ],
    "lordsSupper": []
  },
  "2026-08-27": {
    "dateKey": "2026-08-27",
    "day": 27,
    "monthName": "August",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 102:1–17",
      "Exodus / निर्गमन 4:27–6:1",
      "1 Corinthians / 1 कुरिन्थियों 15:35–49",
      "Matthew / मत्ती 10:24–33"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 102:18–28",
      "Exodus / निर्गमन 6:2–13",
      "1 Corinthians / 1 कुरिन्थियों 15:50–58",
      "Matthew / मत्ती 10:34–42"
    ],
    "lordsSupper": []
  },
  "2026-08-28": {
    "dateKey": "2026-08-28",
    "day": 28,
    "monthName": "August",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Commemoration: Augustine of Hippo, Bishop and Theologian, 430 AD",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 103:1–18",
      "Exodus / निर्गमन 6:14–27",
      "1 Corinthians / 1 कुरिन्थियों 16:1–12",
      "Matthew / मत्ती 11:1–15"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 103:19–22",
      "Exodus / निर्गमन 6:28–7:13",
      "1 Corinthians / 1 कुरिन्थियों 16:13–24",
      "Matthew / मत्ती 11:16–30"
    ],
    "lordsSupper": []
  },
  "2026-08-29": {
    "dateKey": "2026-08-29",
    "day": 29,
    "monthName": "August",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Commemoration: The Beheading of St. John the Baptist",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 104:1–23",
      "Exodus / निर्गमन 7:14–24",
      "2 Corinthians / 2 कुरिन्थियों 1:1–11",
      "Matthew / मत्ती 12:1–14"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 104:24–35",
      "Exodus / निर्गमन 8:1–19",
      "2 Corinthians / 2 कुरिन्थियों 1:12–22",
      "Matthew / मत्ती 12:15–21"
    ],
    "lordsSupper": []
  },
  "2026-08-30": {
    "dateKey": "2026-08-30",
    "day": 30,
    "monthName": "August",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "14th Sunday after Pentecost — Take Up the Cross: Living as a Sacrifice for God",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 26",
      "*OT** Jeremiah / यिर्मयाह 18:1–6",
      "*NT** Romans / रोमियों 12:1–2",
      "and/or Matthew / मत्ती 16:21–28"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26",
      "*OT** Jeremiah / यिर्मयाह 18:1–6",
      "*NT** Romans / रोमियों 12:1–2",
      "and/or Matthew / मत्ती 16:21–28"
    ],
    "lordsSupper": [
      "*OT** Jeremiah / यिर्मयाह 15:15–21",
      "Psalms / भजन संहिता 105:1–6, 23–26, 45c",
      "Epistle Romans / रोमियों 12:9–21",
      "Gosp. John / यूहन्ना 16:25–33"
    ]
  },
  "2026-08-31": {
    "dateKey": "2026-08-31",
    "day": 31,
    "monthName": "August",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 105:1–22",
      "Exodus / निर्गमन 8:20–32",
      "2 Corinthians / 2 कुरिन्थियों 1:23–2:17",
      "Matthew / मत्ती 12:22–32"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 105:23–45",
      "Exodus / निर्गमन 9:1–12",
      "2 Corinthians / 2 कुरिन्थियों 3:1–18",
      "Matthew / मत्ती 12:33–42",
      "# **SEPTEMBER 2026**"
    ],
    "lordsSupper": []
  },
  "2026-09-01": {
    "dateKey": "2026-09-01",
    "day": 1,
    "monthName": "September",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 1",
      "1 Kings / 1 राजाओं 19",
      "Hebrews / इब्रानियों 1:1–9",
      "Luke / लूका 1:1–25"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 2:1–7",
      "1 Kings / 1 राजाओं 20:26end",
      "Hebrews / इब्रानियों 1:10–16",
      "Luke / लूका 1:26–38"
    ],
    "lordsSupper": []
  },
  "2026-09-02": {
    "dateKey": "2026-09-02",
    "day": 2,
    "monthName": "September",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Martyrs of New Guinea 1942",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 2:8–12",
      "1 Kings / 1 राजाओं 21:1–14",
      "Hebrews / इब्रानियों 2:1–9",
      "Luke / लूका 1:39–56"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 3",
      "1 Kings / 1 राजाओं 21:15end",
      "Hebrews / इब्रानियों 2:10–3:6",
      "Luke / लूका 1:57–66"
    ],
    "lordsSupper": []
  },
  "2026-09-03": {
    "dateKey": "2026-09-03",
    "day": 3,
    "monthName": "September",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Sadhu Sundar Singh (Conv. Ev.) bap. 1905",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 4",
      "1 Kings / 1 राजाओं 22:1–14",
      "Hebrews / इब्रानियों 3:7–4:11",
      "Luke / लूका 1:67–80"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 5",
      "1 Kings / 1 राजाओं 22:15–40",
      "Hebrews / इब्रानियों 4:11–5:10",
      "Luke / लूका 2:1–20"
    ],
    "lordsSupper": []
  },
  "2026-09-04": {
    "dateKey": "2026-09-04",
    "day": 4,
    "monthName": "September",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 6",
      "1 Kings / 1 राजाओं 22:41end",
      "Hebrews / इब्रानियों 5:11–44",
      "Luke / लूका 2:21–40"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 7:1–9",
      "2 Kings / 2 राजाओं 1",
      "Hebrews / इब्रानियों 6:1–8",
      "Luke / लूका 2:41–52"
    ],
    "lordsSupper": []
  },
  "2026-09-05": {
    "dateKey": "2026-09-05",
    "day": 5,
    "monthName": "September",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Teacher's Day",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 7:10–17",
      "2 Kings / 2 राजाओं 2:1–18",
      "Hebrews / इब्रानियों 6:9–20",
      "Luke / लूका 3:1–20"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 8",
      "2 Kings / 2 राजाओं 2:19–3:10",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 3:21–38"
    ],
    "lordsSupper": []
  },
  "2026-09-06": {
    "dateKey": "2026-09-06",
    "day": 6,
    "monthName": "September",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "15th Sunday after Pentecost — Our response to the call of God",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 119:41–56",
      "*OT** 1 Samuel / 1 शमूएल 15:10–23",
      "*MT** Acts / प्रेरितों के काम 13:42–52",
      "and/or Matthew / मत्ती 20:1–8"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 119:41–56",
      "*OT** 1 Samuel / 1 शमूएल 15:10–23",
      "*MT** Acts / प्रेरितों के काम 13:42–52",
      "and/or Matthew / मत्ती 20:1–8"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह 6:1–8",
      "Psalms / भजन संहिता 120:1–6",
      "Epistle Romans / रोमियों 8:31–39",
      "Gosp. John / यूहन्ना 15:10–17"
    ]
  },
  "2026-09-07": {
    "dateKey": "2026-09-07",
    "day": 7,
    "monthName": "September",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 9:1–10",
      "2 Kings / 2 राजाओं 3:11end",
      "Hebrews / इब्रानियों 7:1–10",
      "Luke / लूका 4:1–13"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 9:11–20",
      "2 Kings / 2 राजाओं 4:1–17",
      "Hebrews / इब्रानियों 7:11–17",
      "Luke / लूका 4:14–30"
    ],
    "lordsSupper": []
  },
  "2026-09-08": {
    "dateKey": "2026-09-08",
    "day": 8,
    "monthName": "September",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Nativity of the Blessed Virgin Mary",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 10:1–11",
      "2 Kings / 2 राजाओं 4:18–37",
      "Hebrews / इब्रानियों 7:18–28",
      "Luke / लूका 4:31–37"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 10:12–18",
      "2 Kings / 2 राजाओं 4:38 end",
      "Hebrews / इब्रानियों 8:1–13",
      "Luke / लूका 4:38–44"
    ],
    "lordsSupper": []
  },
  "2026-09-09": {
    "dateKey": "2026-09-09",
    "day": 9,
    "monthName": "September",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 11",
      "2 Kings / 2 राजाओं 5:1–19a",
      "Hebrews / इब्रानियों 9:1–10",
      "Luke / लूका 5:1–11"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 12",
      "2 Kings / 2 राजाओं 5:19b–6:7",
      "Hebrews / इब्रानियों 9:11–15",
      "Luke / लूका 5:12–16"
    ],
    "lordsSupper": []
  },
  "2026-09-10": {
    "dateKey": "2026-09-10",
    "day": 10,
    "monthName": "September",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 13",
      "2 Kings / 2 राजाओं 6:8–23",
      "Hebrews / इब्रानियों 9:16–22",
      "Luke / लूका 5:17–26"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 14",
      "2 Kings / 2 राजाओं 6:24–7:2",
      "Hebrews / इब्रानियों 9:23–28",
      "Luke / लूका 5:27–32"
    ],
    "lordsSupper": []
  },
  "2026-09-11": {
    "dateKey": "2026-09-11",
    "day": 11,
    "monthName": "September",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 15",
      "2 Kings / 2 राजाओं 7:3end",
      "Hebrews / इब्रानियों 10:1–10",
      "Luke / लूका 5:33–39"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 16",
      "2 Kings / 2 राजाओं 8:1–15",
      "Hebrews / इब्रानियों 10:11–18",
      "Luke / लूका 6:1–11"
    ],
    "lordsSupper": []
  },
  "2026-09-12": {
    "dateKey": "2026-09-12",
    "day": 12,
    "monthName": "September",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 17:1–9",
      "2 Kings / 2 राजाओं 8:16 end",
      "Hebrews / इब्रानियों 10:19–25",
      "Luke / लूका 6:12–26"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 17:10–15",
      "2 Kings / 2 राजाओं 9:1–13",
      "Hebrews / इब्रानियों 10:26–31",
      "Luke / लूका 6:27–36"
    ],
    "lordsSupper": []
  },
  "2026-09-13": {
    "dateKey": "2026-09-13",
    "day": 13,
    "monthName": "September",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "16th Sunday after Pentecost — Nothing is impossible for God",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 124",
      "*OT** Exodus / निर्गमन 4:10–17",
      "*NT** Ephesians / इफिसियों 6:10–18",
      "and/or Mark / मरकुस 9:14–29"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 124",
      "*OT** Exodus / निर्गमन 4:10–17",
      "*NT** Ephesians / इफिसियों 6:10–18",
      "and/or Mark / मरकुस 9:14–29"
    ],
    "lordsSupper": [
      "*OT** Genesis / उत्पत्ति 18:9–15",
      "Psalms / भजन संहिता 125:1–7",
      "Epistle Ephesians / इफिसियों 1:15–23",
      "Gosp. Mark / मरकुस 10:23–27"
    ]
  },
  "2026-09-14": {
    "dateKey": "2026-09-14",
    "day": 14,
    "monthName": "September",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Cyprian of Carthage (Bp. Th. Mar.), 258; John Chrysostom (Bp. Th.), 407",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 18:1–11",
      "2 Kings / 2 राजाओं 9:14–28",
      "Hebrews / इब्रानियों 10:32–39",
      "Luke / लूका 6:37–42"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 18:12–20",
      "2 Kings / 2 राजाओं 9:30–10:14",
      "Hebrews / इब्रानियों 11:1–10",
      "Luke / लूका 6:43–49"
    ],
    "lordsSupper": []
  },
  "2026-09-15": {
    "dateKey": "2026-09-15",
    "day": 15,
    "monthName": "September",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 18:21–30",
      "2 Kings / 2 राजाओं 10:15end",
      "Hebrews / इब्रानियों 11:16",
      "Luke / लूका 7:1–10"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 18:31–36",
      "2 Kings / 2 राजाओं 11:1–20",
      "Hebrews / इब्रानियों 11:17–23",
      "Luke / लूका 7:11–17"
    ],
    "lordsSupper": []
  },
  "2026-09-16": {
    "dateKey": "2026-09-16",
    "day": 16,
    "monthName": "September",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 18:37–42",
      "2 Kings / 2 राजाओं 11:21end",
      "Hebrews / इब्रानियों 11:24–31",
      "Luke / लूका 7:18–35"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 18:43–50",
      "2 Kings / 2 राजाओं 13:1–21",
      "Hebrews / इब्रानियों 11:32–39",
      "Luke / लूका 7:36–50"
    ],
    "lordsSupper": []
  },
  "2026-09-17": {
    "dateKey": "2026-09-17",
    "day": 17,
    "monthName": "September",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 19:1–8",
      "2 Kings / 2 राजाओं 13:22",
      "Hebrews / इब्रानियों 12:1–2",
      "Luke / लूका 8:1–15"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 19:9–14",
      "2 Kings / 2 राजाओं 14:17–15:7",
      "Hebrews / इब्रानियों 12:6–21",
      "Luke / लूका 8:16–21"
    ],
    "lordsSupper": []
  },
  "2026-09-18": {
    "dateKey": "2026-09-18",
    "day": 18,
    "monthName": "September",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 20:1–5",
      "2 Kings / 2 राजाओं 15:8–26",
      "Hebrews / इब्रानियों 12:22–29",
      "Luke / लूका 8:22–25"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 20:6–9",
      "2 Kings / 2 राजाओं 15:27–16:4",
      "Hebrews / इब्रानियों 13:1–10",
      "Luke / लूका 8:26–29"
    ],
    "lordsSupper": []
  },
  "2026-09-19": {
    "dateKey": "2026-09-19",
    "day": 19,
    "monthName": "September",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 21:1–7",
      "2 Kings / 2 राजाओं 16:5 end",
      "Hebrews / इब्रानियों 13:11–25",
      "Luke / लूका 8:40–56"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 21:8–13",
      "2 Kings / 2 राजाओं 17:1–23",
      "Hebrews / इब्रानियों 13:22–25",
      "Luke / लूका 9:1–9"
    ],
    "lordsSupper": []
  },
  "2026-09-20": {
    "dateKey": "2026-09-20",
    "day": 20,
    "monthName": "September",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "17th Sunday after Pentecost — Lessons of the cross for daily life",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 126",
      "*OT** Numbers / गिनती 11:16–24",
      "*NT** 1 Corinthians / 1 कुरिन्थियों 1:1–18",
      "and/or Mark / मरकुस 9:30–37",
      "Notice of Matthew, Apostle and Evangelist on 21st September*"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 126",
      "*OT** Numbers / गिनती 11:16–24",
      "*NT** 1 Corinthians / 1 कुरिन्थियों 1:1–18",
      "and/or Mark / मरकुस 9:30–37",
      "Notice of Matthew, Apostle and Evangelist on 21st September*"
    ],
    "lordsSupper": [
      "*OT** Numbers / गिनती 11:24–29",
      "Psalms / भजन संहिता 133",
      "Epistle 1 Corinthians / 1 कुरिन्थियों 11:22–30",
      "Gosp. Luke / लूका 12:1–12"
    ]
  },
  "2026-09-21": {
    "dateKey": "2026-09-21",
    "day": 21,
    "monthName": "September",
    "year": 2026,
    "dayName": "Monday",
    "theme": "St. Matthew, Apostle and Evangelist — Thanksgiving for the call of Matthew to be an Apostle",
    "color": "Red",
    "morningWorship": [
      "Psalms / भजन संहिता 119:33–40",
      "Isaiah / यशायाह 33:13–22",
      "1 John / 1 यूहन्ना 2:15–17",
      "Matthew / मत्ती 9:9–13"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 30:1–7",
      "Isaiah / यशायाह 35:1–10",
      "James / याकूब 5:10–16",
      "Matthew / मत्ती 9:14–30"
    ],
    "lordsSupper": []
  },
  "2026-09-22": {
    "dateKey": "2026-09-22",
    "day": 22,
    "monthName": "September",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 22:1–8",
      "2 Kings / 2 राजाओं 17:24 end",
      "1 Corinthians / 1 कुरिन्थियों 1:17",
      "Luke / लूका 9:10–17"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22:9–18",
      "2 Kings / 2 राजाओं 18:1–16",
      "1 Corinthians / 1 कुरिन्थियों 1:18–31",
      "Luke / लूका 9:18–27"
    ],
    "lordsSupper": []
  },
  "2026-09-23": {
    "dateKey": "2026-09-23",
    "day": 23,
    "monthName": "September",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 22:19–24",
      "2 Kings / 2 राजाओं 18:17end",
      "1 Corinthians / 1 कुरिन्थियों 2:1–7",
      "Luke / लूका 9:28–36"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22:25–28",
      "2 Kings / 2 राजाओं 19:1–19",
      "1 Corinthians / 1 कुरिन्थियों 1:18–31",
      "Luke / लूका 9:37–45"
    ],
    "lordsSupper": []
  },
  "2026-09-24": {
    "dateKey": "2026-09-24",
    "day": 24,
    "monthName": "September",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 22:29–31",
      "2 Kings / 2 राजाओं 19:20end",
      "1 Corinthians / 1 कुरिन्थियों 2:1–5",
      "Luke / लूका 9:46–55"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22:25–28",
      "2 Kings / 2 राजाओं 20",
      "1 Corinthians / 1 कुरिन्थियों 2:6–16",
      "Luke / लूका 9:57–62"
    ],
    "lordsSupper": []
  },
  "2026-09-25": {
    "dateKey": "2026-09-25",
    "day": 25,
    "monthName": "September",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 24:1–6",
      "2 Kings / 2 राजाओं 21:1–18",
      "1 Corinthians / 1 कुरिन्थियों 3:1–23",
      "Luke / लूका 10:1–24"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22:25–28",
      "2 Kings / 2 राजाओं 21:19 end",
      "1 Corinthians / 1 कुरिन्थियों 4:1–21",
      "Luke / लूका 10:25–37"
    ],
    "lordsSupper": []
  },
  "2026-09-26": {
    "dateKey": "2026-09-26",
    "day": 26,
    "monthName": "September",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 25:1–3",
      "2 Kings / 2 राजाओं 22:14 end",
      "1 Corinthians / 1 कुरिन्थियों 5:1–13",
      "Luke / लूका 10:38–42"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 22:25–28",
      "2 Kings / 2 राजाओं 23:8–20",
      "1 Corinthians / 1 कुरिन्थियों 6:1–11",
      "Luke / लूका 11:1–13"
    ],
    "lordsSupper": []
  },
  "2026-09-27": {
    "dateKey": "2026-09-27",
    "day": 27,
    "monthName": "September",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "18th Sunday after Pentecost — The family: husband and wife",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 127",
      "*OT** Malachi / मलाकी 2:1–16",
      "*NT** 1 Corinthians / 1 कुरिन्थियों 13",
      "and/or Mark / मरकुस 10:1–12",
      "Notice of Michael & All Angels on 29th September*"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 127",
      "*OT** Malachi / मलाकी 2:1–16",
      "*NT** 1 Corinthians / 1 कुरिन्थियों 13",
      "and/or Mark / मरकुस 10:1–12",
      "Notice of Michael & All Angels on 29th September*"
    ],
    "lordsSupper": [
      "*OT** Genesis / उत्पत्ति 2:18–25",
      "Psalms / भजन संहिता 128",
      "Epistle Ephesians / इफिसियों 5:22–32",
      "Gosp. Matthew / मत्ती 22:23–33"
    ]
  },
  "2026-09-28": {
    "dateKey": "2026-09-28",
    "day": 28,
    "monthName": "September",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 25:12–22",
      "2 Kings / 2 राजाओं 23:21end",
      "1 Corinthians / 1 कुरिन्थियों 6:12–20",
      "Luke / लूका 11:14–28"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26:1–8",
      "2 Kings / 2 राजाओं 24:8 end",
      "1 Corinthians / 1 कुरिन्थियों 7:1–11",
      "Luke / लूका 11:29–36"
    ],
    "lordsSupper": []
  },
  "2026-09-29": {
    "dateKey": "2026-09-29",
    "day": 29,
    "monthName": "September",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Michael and all Angels — Pandita Ramabai (Conv. Ev.), bap. 1883 — Praise to God in union with all hosts of heaven",
    "color": "White",
    "morningWorship": [
      "Psalms / भजन संहिता 91",
      "2 Kings / 2 राजाओं 6:8–17",
      "Revelation / प्रकाशितवाक्य 12:7–12",
      "Matthew / मत्ती 18:1–14"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 26:1–8",
      "2 Kings / 2 राजाओं 6:8–17",
      "Revelation / प्रकाशितवाक्य 12:7–12",
      "Matthew / मत्ती 18:1–14"
    ],
    "lordsSupper": []
  },
  "2026-09-30": {
    "dateKey": "2026-09-30",
    "day": 30,
    "monthName": "September",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Psalms / भजन संहिता 26:9–12",
      "2 Kings / 2 राजाओं 25:8 end",
      "1 Corinthians / 1 कुरिन्थियों 7:12–24",
      "Luke / लूका 11:37–53"
    ],
    "eveningWorship": [
      "Psalms / भजन संहिता 27:1–6",
      "Lamentations / विलापगीत 1:14–22",
      "1 Corinthians / 1 कुरिन्थियों 7:25–40",
      "Luke / लूका 12:1–12"
    ],
    "lordsSupper": []
  },
  "2026-10-01": {
    "dateKey": "2026-10-01",
    "day": 1,
    "monthName": "October",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 2, Verse 1–13",
      "Philippians / फिलिप्पियों : Chapter 2, Verse 1–11",
      "Matthew / मत्ती : Chapter 21, Verse 23–32",
      "Psalm(s) / भजन संहिता : 78:1–39"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 2, Verse 14–32",
      "Philippians / फिलिप्पियों : Chapter 2, Verse 12–30",
      "Matthew / मत्ती : Chapter 21, Verse 33–46",
      "Psalm(s) / भजन संहिता : 78:40–72"
    ],
    "lordsSupper": []
  },
  "2026-10-02": {
    "dateKey": "2026-10-02",
    "day": 2,
    "monthName": "October",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 3, Verse 1–14",
      "Philippians / फिलिप्पियों : Chapter 3, Verse 1–11",
      "Matthew / मत्ती : Chapter 22, Verse 1–14",
      "Psalm(s) / भजन संहिता : 79"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 3, Verse 15–25",
      "Philippians / फिलिप्पियों : Chapter 3, Verse 12–21",
      "Matthew / मत्ती : Chapter 22, Verse 15–22",
      "Psalm(s) / भजन संहिता : 80"
    ],
    "lordsSupper": []
  },
  "2026-10-03": {
    "dateKey": "2026-10-03",
    "day": 3,
    "monthName": "October",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 4, Verse 1–10",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 1–9",
      "Matthew / मत्ती : Chapter 22, Verse 23–33",
      "Psalm(s) / भजन संहिता : 81"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 4, Verse 11–28",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 10–23",
      "Matthew / मत्ती : Chapter 22, Verse 34–46",
      "Psalm(s) / भजन संहिता : 82"
    ],
    "lordsSupper": []
  },
  "2026-10-04": {
    "dateKey": "2026-10-04",
    "day": 4,
    "monthName": "October",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "Responding to God's invitation with righteous living",
    "color": "Green",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 19",
      "*OT** Exodus / निर्गमन : Chapter 20, Verse 1–4, 7–9, 12–20",
      "*NT** Philippians / फिलिप्पियों : Chapter 3, Verse 4b–14",
      "Matthew / मत्ती : Chapter 21, Verse 33–46 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 19",
      "*OT** Exodus / निर्गमन : Chapter 20, Verse 1–4, 7–9, 12–20",
      "*NT** Philippians / फिलिप्पियों : Chapter 3, Verse 4b–14",
      "Matthew / मत्ती : Chapter 21, Verse 33–46 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह : Chapter 5, Verse 1–7",
      "Psalm(s) / भजन संहिता : 34",
      "Epistle: 1 Corinthians / 1 कुरिन्थियों : Chapter 9, Verse 6–16",
      "Gospel: Matthew / मत्ती : Chapter 23, Verse 1–12"
    ]
  },
  "2026-10-05": {
    "dateKey": "2026-10-05",
    "day": 5,
    "monthName": "October",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 5, Verse 1–9",
      "Colossians / कुलुस्सियों : Chapter 1, Verse 1–14",
      "Matthew / मत्ती : Chapter 23, Verse 1–12",
      "Psalm(s) / भजन संहिता : 83"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 5, Verse 10–19",
      "Colossians / कुलुस्सियों : Chapter 1, Verse 15–23",
      "Matthew / मत्ती : Chapter 23, Verse 13–26",
      "Psalm(s) / भजन संहिता : 84"
    ],
    "lordsSupper": []
  },
  "2026-10-06": {
    "dateKey": "2026-10-06",
    "day": 6,
    "monthName": "October",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "St. Thomas, Apostle of India",
    "color": "Red",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 6, Verse 1–15",
      "Colossians / कुलुस्सियों : Chapter 1, Verse 24 – Chapter 2, Verse 7",
      "Matthew / मत्ती : Chapter 23, Verse 27–39",
      "Psalm(s) / भजन संहिता : 85"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 6, Verse 16–30",
      "Colossians / कुलुस्सियों : Chapter 2, Verse 8–23",
      "Matthew / मत्ती : Chapter 24, Verse 1–14",
      "Psalm(s) / भजन संहिता : 86"
    ],
    "lordsSupper": []
  },
  "2026-10-07": {
    "dateKey": "2026-10-07",
    "day": 7,
    "monthName": "October",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 7, Verse 1–15",
      "Colossians / कुलुस्सियों : Chapter 3, Verse 1–11",
      "Matthew / मत्ती : Chapter 24, Verse 15–31",
      "Psalm(s) / भजन संहिता : 87"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 7, Verse 16–28",
      "Colossians / कुलुस्सियों : Chapter 3, Verse 12–17",
      "Matthew / मत्ती : Chapter 24, Verse 32–51",
      "Psalm(s) / भजन संहिता : 88"
    ],
    "lordsSupper": []
  },
  "2026-10-08": {
    "dateKey": "2026-10-08",
    "day": 8,
    "monthName": "October",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 8, Verse 1–17",
      "Colossians / कुलुस्सियों : Chapter 3, Verse 18 – Chapter 4, Verse 1",
      "Matthew / मत्ती : Chapter 25, Verse 1–13",
      "Psalm(s) / भजन संहिता : 89:1–18"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 8, Verse 18 – Chapter 9, Verse 6",
      "Colossians / कुलुस्सियों : Chapter 4, Verse 2–18",
      "Matthew / मत्ती : Chapter 25, Verse 14–30",
      "Psalm(s) / भजन संहिता : 89:19–52"
    ],
    "lordsSupper": []
  },
  "2026-10-09": {
    "dateKey": "2026-10-09",
    "day": 9,
    "monthName": "October",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 9, Verse 7–16",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 1, Verse 1–10",
      "Matthew / मत्ती : Chapter 25, Verse 31–46",
      "Psalm(s) / भजन संहिता : 90"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 9, Verse 17–26",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 2, Verse 1–12",
      "Matthew / मत्ती : Chapter 26, Verse 1–16",
      "Psalm(s) / भजन संहिता : 91"
    ],
    "lordsSupper": []
  },
  "2026-10-10": {
    "dateKey": "2026-10-10",
    "day": 10,
    "monthName": "October",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 10, Verse 1–16",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 2, Verse 13–20",
      "Matthew / मत्ती : Chapter 26, Verse 17–30",
      "Psalm(s) / भजन संहिता : 92"
    ],
    "eveningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 10, Verse 17–25",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 3, Verse 1–13",
      "Matthew / मत्ती : Chapter 26, Verse 31–46",
      "Psalm(s) / भजन संहिता : 93"
    ],
    "lordsSupper": []
  },
  "2026-10-11": {
    "dateKey": "2026-10-11",
    "day": 11,
    "monthName": "October",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "Living with humility, integrity and readiness for Christ",
    "color": "Green",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 106:1–10",
      "*OT** Exodus / निर्गमन : Chapter 32, Verse 7–14",
      "*NT** 2 Corinthians / 2 कुरिन्थियों : Chapter 5, Verse 1–10",
      "Matthew / मत्ती : Chapter 24, Verse 3–14 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 106:1–10",
      "*OT** Exodus / निर्गमन : Chapter 32, Verse 7–14",
      "*NT** 2 Corinthians / 2 कुरिन्थियों : Chapter 5, Verse 1–10",
      "Matthew / मत्ती : Chapter 24, Verse 3–14 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Amos / आमोस : Chapter 5, Verse 18–27",
      "Psalm(s) / भजन संहिता : 106:11–23",
      "Epistle: Romans / रोमियों : Chapter 6, Verse 15–23",
      "Gospel: Matthew / मत्ती : Chapter 24, Verse 3–14"
    ]
  },
  "2026-10-12": {
    "dateKey": "2026-10-12",
    "day": 12,
    "monthName": "October",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 29, Verse 8–23",
      "Acts / प्रेरितों के काम : Chapter 26, Verse 19–24",
      "Matthew / मत्ती : Chapter 10, Verse 5–15",
      "Psalm(s) / भजन संहिता : 102:1–17"
    ],
    "eveningWorship": [
      "*OT** 2 Kings / 2 राजाओं : Chapter 5, Verse 15–19a",
      "Acts / प्रेरितों के काम : Chapter 26, Verse 25–32",
      "Matthew / मत्ती : Chapter 10, Verse 16–21",
      "Psalm(s) / भजन संहिता : 61"
    ],
    "lordsSupper": []
  },
  "2026-10-13": {
    "dateKey": "2026-10-13",
    "day": 13,
    "monthName": "October",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 29, Verse 24–32",
      "Ephesians / इफिसियों : Chapter 6, Verse 10–20",
      "Matthew / मत्ती : Chapter 10, Verse 16–23",
      "Psalm(s) / भजन संहिता : 102:1–17"
    ],
    "eveningWorship": [
      "*OT** 2 Kings / 2 राजाओं : Chapter 5, Verse 19b–27",
      "Ephesians / इफिसियों : Chapter 6, Verse 18–23",
      "Matthew / मत्ती : Chapter 10, Verse 24–31",
      "Psalm(s) / भजन संहिता : 61"
    ],
    "lordsSupper": []
  },
  "2026-10-14": {
    "dateKey": "2026-10-14",
    "day": 14,
    "monthName": "October",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "*OT** Isaiah / यशायाह : Chapter 30, Verse 15–21",
      "Ephesians / इफिसियों : Chapter 1, Verse 15–23",
      "Matthew / मत्ती : Chapter 13, Verse 10–17",
      "Psalm(s) / भजन संहिता : 119:49–72"
    ],
    "eveningWorship": [
      "*OT** Deuteronomy / व्यवस्थाविवरण : Chapter 8, Verse 1–10",
      "1 Peter / 1 पतरस : Chapter 1, Verse 3–9",
      "Luke / लूका : Chapter 12, Verse 22–34",
      "Psalm(s) / भजन संहिता : 119:73–104"
    ],
    "lordsSupper": []
  },
  "2026-10-15": {
    "dateKey": "2026-10-15",
    "day": 15,
    "monthName": "October",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Commemoration: Teresa of Avila",
    "color": "Green",
    "morningWorship": [
      "Song of Songs / श्रेष्ठगीत : Chapter 8, Verse 6–7",
      "Romans / रोमियों : Chapter 8, Verse 18–30",
      "John / यूहन्ना : Chapter 14, Verse 1–7",
      "Psalm(s) / भजन संहिता : 42"
    ],
    "eveningWorship": [
      "Proverbs / नीतिवचन : Chapter 8, Verse 1–11",
      "Ephesians / इफिसियों : Chapter 3, Verse 14–21",
      "Matthew / मत्ती : Chapter 11, Verse 25–30",
      "Psalm(s) / भजन संहिता : 43"
    ],
    "lordsSupper": []
  },
  "2026-10-16": {
    "dateKey": "2026-10-16",
    "day": 16,
    "monthName": "October",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Commemoration: Henry Martyn (Evangelist)",
    "color": "Green",
    "morningWorship": [
      "*OT** Isaiah / यशायाह : Chapter 49, Verse 1–6",
      "Acts / प्रेरितों के काम : Chapter 13, Verse 44–52",
      "Mark / मरकुस : Chapter 13, Verse 9–11",
      "Psalm(s) / भजन संहिता : 96"
    ],
    "eveningWorship": [
      "Jonah / योना : Chapter 3, Verse 1–10",
      "Romans / रोमियों : Chapter 10, Verse 5–17",
      "Luke / लूका : Chapter 10, Verse 1–12",
      "Psalm(s) / भजन संहिता : 67"
    ],
    "lordsSupper": []
  },
  "2026-10-17": {
    "dateKey": "2026-10-17",
    "day": 17,
    "monthName": "October",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Ecclesiastes / सभोपदेशक : Chapter 3, Verse 1–15",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 5, Verse 1–11",
      "John / यूहन्ना : Chapter 9, Verse 1–12",
      "Psalm(s) / भजन संहिता : 34:1–14"
    ],
    "eveningWorship": [
      "Job / अय्यूब : Chapter 42, Verse 1–6",
      "1 John / 1 यूहन्ना : Chapter 1, Verse 1–10",
      "Matthew / मत्ती : Chapter 9, Verse 27–38",
      "Psalm(s) / भजन संहिता : 34:15–22"
    ],
    "lordsSupper": []
  },
  "2026-10-18": {
    "dateKey": "2026-10-18",
    "day": 18,
    "monthName": "October",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "Living faithfully in a divided world / St. Luke the Evangelist",
    "color": "White",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 147:1–7",
      "*OT** Isaiah / यशायाह : Chapter 35, Verse 1–10",
      "*NT** 2 Corinthians / 2 कुरिन्थियों : Chapter 5, Verse 11–19",
      "Luke / लूका : Chapter 21, Verse 20–28 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 147:1–7",
      "*OT** Isaiah / यशायाह : Chapter 35, Verse 1–10",
      "*NT** 2 Corinthians / 2 कुरिन्थियों : Chapter 5, Verse 11–19",
      "Luke / लूका : Chapter 21, Verse 20–28 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Ezekiel / यहेजकेल : Chapter 47, Verse 1–12",
      "Psalm(s) / भजन संहिता : 103",
      "Epistle: Galatians / गलातियों : Chapter 5, Verse 1–12",
      "Gospel: Luke / लूका : Chapter 21, Verse 20–28"
    ]
  },
  "2026-10-19": {
    "dateKey": "2026-10-19",
    "day": 19,
    "monthName": "October",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Proverbs / नीतिवचन : Chapter 3, Verse 1–12",
      "Galatians / गलातियों : Chapter 2, Verse 15–21",
      "Matthew / मत्ती : Chapter 6, Verse 25–34",
      "Psalm(s) / भजन संहिता : 5"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 17, Verse 5–10",
      "Romans / रोमियों : Chapter 6, Verse 1–14",
      "John / यूहन्ना : Chapter 6, Verse 22–35",
      "Psalm(s) / भजन संहिता : 6"
    ],
    "lordsSupper": []
  },
  "2026-10-20": {
    "dateKey": "2026-10-20",
    "day": 20,
    "monthName": "October",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Exodus / निर्गमन : Chapter 15, Verse 21",
      "1 Corinthians / 1 कुरिन्थियों : Chapter 10, Verse 1–13",
      "Matthew / मत्ती : Chapter 16, Verse 1–12",
      "Psalm(s) / भजन संहिता : 19"
    ],
    "eveningWorship": [
      "Deuteronomy / व्यवस्थाविवरण : Chapter 11, Verse 18–25",
      "Hebrews / इब्रानियों : Chapter 11, Verse 1–16",
      "Mark / मरकुस : Chapter 6, Verse 30–44",
      "Psalm(s) / भजन संहिता : 20"
    ],
    "lordsSupper": []
  },
  "2026-10-21": {
    "dateKey": "2026-10-21",
    "day": 21,
    "monthName": "October",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 32, Verse 36–41",
      "Galatians / गलातियों : Chapter 5, Verse 26",
      "Luke / लूका : Chapter 11, Verse 1–13",
      "Psalm(s) / भजन संहिता : 119:1–24"
    ],
    "eveningWorship": [
      "Ezekiel / यहेजकेल : Chapter 36, Verse 24–28",
      "Ephesians / इफिसियों : Chapter 4, Verse 17–32",
      "John / यूहन्ना : Chapter 15, Verse 1–17",
      "Psalm(s) / भजन संहिता : 20"
    ],
    "lordsSupper": []
  },
  "2026-10-22": {
    "dateKey": "2026-10-22",
    "day": 22,
    "monthName": "October",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Deuteronomy / व्यवस्थाविवरण : Chapter 26, Verse 1–11",
      "Philippians / फिलिप्पियों : Chapter 1, Verse 3–11",
      "Matthew / मत्ती : Chapter 5, Verse 1–12",
      "Psalm(s) / भजन संहिता : 145:1–13"
    ],
    "eveningWorship": [
      "Amos / आमोस : Chapter 9, Verse 11–15",
      "Romans / रोमियों : Chapter 12, Verse 1–8",
      "Luke / लूका : Chapter 6, Verse 27–38",
      "Psalm(s) / भजन संहिता : 145:14–21"
    ],
    "lordsSupper": []
  },
  "2026-10-23": {
    "dateKey": "2026-10-23",
    "day": 23,
    "monthName": "October",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 58, Verse 1–14",
      "Romans / रोमियों : Chapter 3, Verse 21–31",
      "John / यूहन्ना : Chapter 8, Verse 12–20",
      "Psalm(s) / भजन संहिता : 111"
    ],
    "eveningWorship": [
      "Nehemiah / नहेम्याह : Chapter 8, Verse 1–12",
      "James / याकूब : Chapter 1, Verse 22–27",
      "Matthew / मत्ती : Chapter 7, Verse 7–14",
      "Psalm(s) / भजन संहिता : 112"
    ],
    "lordsSupper": []
  },
  "2026-10-24": {
    "dateKey": "2026-10-24",
    "day": 24,
    "monthName": "October",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Genesis / उत्पत्ति : Chapter 28, Verse 10–22",
      "Hebrews / इब्रानियों : Chapter 10, Verse 19–25",
      "John / यूहन्ना : Chapter 10, Verse 1–10",
      "Psalm(s) / भजन संहिता : 84"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 65, Verse 17–25",
      "1 Peter / 1 पतरस : Chapter 2, Verse 1–10",
      "Mark / मरकुस : Chapter 1, Verse 35–39",
      "Psalm(s) / भजन संहिता : 112"
    ],
    "lordsSupper": []
  },
  "2026-10-25": {
    "dateKey": "2026-10-25",
    "day": 25,
    "monthName": "October",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "Freed by Grace and Reformed faithfully (Reformation Sunday)",
    "color": "Green",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 46",
      "*OT** Habakkuk / हबक्कूक : Chapter 2, Verse 1–6",
      "*NT** Galatians / गलातियों : Chapter 3, Verse 1–11",
      "John / यूहन्ना : Chapter 8, Verse 31–36 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 46",
      "*OT** Habakkuk / हबक्कूक : Chapter 2, Verse 1–6",
      "*NT** Galatians / गलातियों : Chapter 3, Verse 1–11",
      "John / यूहन्ना : Chapter 8, Verse 31–36 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Deuteronomy / व्यवस्थाविवरण : Chapter 6, Verse 1–9",
      "Psalm(s) / भजन संहिता : 119:41–48",
      "Epistle: Romans / रोमियों : Chapter 1, Verse 8–17",
      "Gospel: Luke / लूका : Chapter 18, Verse 9–14"
    ]
  },
  "2026-10-26": {
    "dateKey": "2026-10-26",
    "day": 26,
    "monthName": "October",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Hosea / होशे : Chapter 6, Verse 1–6",
      "Romans / रोमियों : Chapter 11, Verse 1–10",
      "Luke / लूका : Chapter 13, Verse 10–17",
      "Psalm(s) / भजन संहिता : 125"
    ],
    "eveningWorship": [
      "Ezekiel / यहेजकेल : Chapter 11, Verse 14–20",
      "Romans / रोमियों : Chapter 11, Verse 11–24",
      "Matthew / मत्ती : Chapter 23, Verse 1–12",
      "Psalm(s) / भजन संहिता : 20"
    ],
    "lordsSupper": []
  },
  "2026-10-27": {
    "dateKey": "2026-10-27",
    "day": 27,
    "monthName": "October",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "Commemoration: Frumentius of Ethiopia",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 42, Verse 1–7",
      "Romans / रोमियों : Chapter 11, Verse 1–10",
      "Matthew / मत्ती : Chapter 28, Verse 16–20",
      "Psalm(s) / भजन संहिता : 96"
    ],
    "eveningWorship": [
      "Zechariah / जकर्याह : Chapter 8, Verse 20–23",
      "Acts / प्रेरितों के काम : Chapter 1, Verse 6–14",
      "John / यूहन्ना : Chapter 17, Verse 20–26",
      "Psalm(s) / भजन संहिता : 67"
    ],
    "lordsSupper": []
  },
  "2026-10-28": {
    "dateKey": "2026-10-28",
    "day": 28,
    "monthName": "October",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "Commemoration: Feast of Simon & Jude, Apostles",
    "color": "Red",
    "morningWorship": [
      "Deuteronomy / व्यवस्थाविवरण : Chapter 32, Verse 1–4",
      "Jude / यहूदा : Verse 1–3, 17–25",
      "John / यूहन्ना : Chapter 15, Verse 17–27",
      "Psalm(s) / भजन संहिता : 119:137–144"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 52, Verse 7–10",
      "Ephesians / इफिसियों : Chapter 2, Verse 13–22",
      "John / यूहन्ना : Chapter 14, Verse 18–31",
      "Psalm(s) / भजन संहिता : 119:145–160"
    ],
    "lordsSupper": []
  },
  "2026-10-29": {
    "dateKey": "2026-10-29",
    "day": 29,
    "monthName": "October",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Joel / योएल : Chapter 2, Verse 12–17",
      "1 John / 1 यूहन्ना : Chapter 1, Verse 1–10",
      "Luke / लूका : Chapter 18, Verse 9–14",
      "Psalm(s) / भजन संहिता : 51:1–12"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 55, Verse 6–13",
      "2 Corinthians / 2 कुरिन्थियों : Chapter 5, Verse 16–21",
      "John / यूहन्ना : Chapter 6, Verse 35–40",
      "Psalm(s) / भजन संहिता : 51:13–19"
    ],
    "lordsSupper": []
  },
  "2026-10-30": {
    "dateKey": "2026-10-30",
    "day": 30,
    "monthName": "October",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Exodus / निर्गमन : Chapter 33, Verse 12–23",
      "Romans / रोमियों : Chapter 8, Verse 26–39",
      "Matthew / मत्ती : Chapter 11, Verse 25–30",
      "Psalm(s) / भजन संहिता : 121"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 49, Verse 13–18",
      "1 Peter / 1 पतरस : Chapter 5, Verse 1–11",
      "John / यूहन्ना : Chapter 6, Verse 35–40",
      "Psalm(s) / भजन संहिता : 123"
    ],
    "lordsSupper": []
  },
  "2026-10-31": {
    "dateKey": "2026-10-31",
    "day": 31,
    "monthName": "October",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Reformation Day",
    "color": "Green",
    "morningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 31, Verse 31–34",
      "Romans / रोमियों : Chapter 1, Verse 16–17",
      "John / यूहन्ना : Chapter 8, Verse 31–36",
      "Psalm(s) / भजन संहिता : 46"
    ],
    "eveningWorship": [
      "2 Chronicles / 2 इतिहास : Chapter 34, Verse 29–33",
      "Galatians / गलातियों : Chapter 2, Verse 15–21",
      "Mark / मरकुस : Chapter 12, Verse 28–34",
      "Psalm(s) / भजन संहिता : 119:89–96",
      "*NOVEMBER 2026**"
    ],
    "lordsSupper": []
  },
  "2026-11-01": {
    "dateKey": "2026-11-01",
    "day": 1,
    "monthName": "November",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "The Communion of Saints in the Life of the Church (All Saints Day)",
    "color": "White",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 34:1–10",
      "*OT** Deuteronomy / व्यवस्थाविवरण : Chapter 34, Verse 1–12",
      "*NT** Revelation / प्रकाशितवाक्य : Chapter 7, Verse 9–17",
      "Luke / लूका : Chapter 9, Verse 28–36 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 34:1–10",
      "*OT** Deuteronomy / व्यवस्थाविवरण : Chapter 34, Verse 1–12",
      "*NT** Revelation / प्रकाशितवाक्य : Chapter 7, Verse 9–17",
      "Luke / लूका : Chapter 9, Verse 28–36 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह : Chapter 65, Verse 17–25",
      "Psalm(s) / भजन संहिता : 149",
      "Epistle: Hebrews / इब्रानियों : Chapter 11, Verse 32–40",
      "Gospel: Matthew / मत्ती : Chapter 17, Verse 1–8"
    ]
  },
  "2026-11-02": {
    "dateKey": "2026-11-02",
    "day": 2,
    "monthName": "November",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Commemoration of the Faithful Departed (All Soul's Day)",
    "color": "White",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 25, Verse 6–9",
      "Romans / रोमियों : Chapter 8, Verse 31–39",
      "John / यूहन्ना : Chapter 14, Verse 1–6",
      "Psalm(s) / भजन संहिता : 23"
    ],
    "eveningWorship": [
      "Job / अय्यूब : Chapter 3, Verse 1–9",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 4, Verse 13–18",
      "John / यूहन्ना : Chapter 11, Verse 17–27",
      "Psalm(s) / भजन संहिता : 116"
    ],
    "lordsSupper": []
  },
  "2026-11-03": {
    "dateKey": "2026-11-03",
    "day": 3,
    "monthName": "November",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Deuteronomy / व्यवस्थाविवरण : Chapter 6, Verse 10–15",
      "Hebrews / इब्रानियों : Chapter 3, Verse 1–6",
      "Matthew / मत्ती : Chapter 13, Verse 18–23",
      "Psalm(s) / भजन संहिता : 5"
    ],
    "eveningWorship": [
      "Micah / मीका : Chapter 6, Verse 6–8",
      "Romans / रोमियों : Chapter 12, Verse 9–21",
      "Luke / लूका : Chapter 11, Verse 29–36",
      "Psalm(s) / भजन संहिता : 36"
    ],
    "lordsSupper": []
  },
  "2026-11-04": {
    "dateKey": "2026-11-04",
    "day": 4,
    "monthName": "November",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 58, Verse 6–12",
      "Colossians / कुलुस्सियों : Chapter 3, Verse 12–17",
      "Mark / मरकुस : Chapter 12, Verse 28–34",
      "Psalm(s) / भजन संहिता : 26"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 9, Verse 23–24",
      "James / याकूब : Chapter 3, Verse 13–18",
      "Luke / लूका : Chapter 10, Verse 25–37",
      "Psalm(s) / भजन संहिता : 15"
    ],
    "lordsSupper": []
  },
  "2026-11-05": {
    "dateKey": "2026-11-05",
    "day": 5,
    "monthName": "November",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Genesis / उत्पत्ति : Chapter 18, Verse 1–15",
      "1 Peter / 1 पतरस : Chapter 3, Verse 8–16",
      "John / यूहन्ना : Chapter 8, Verse 31–36",
      "Psalm(s) / भजन संहिता : 33:1–9"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 30, Verse 15–18",
      "Ephesians / इफिसियों : Chapter 6, Verse 10–20",
      "Luke / लूका : Chapter 18, Verse 1–8",
      "Psalm(s) / भजन संहिता : 37:1–11"
    ],
    "lordsSupper": []
  },
  "2026-11-06": {
    "dateKey": "2026-11-06",
    "day": 6,
    "monthName": "November",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Amos / आमोस : Chapter 5, Verse 9–12",
      "2 Corinthians / 2 कुरिन्थियों : Chapter 5, Verse 16–21",
      "Matthew / मत्ती : Chapter 25, Verse 31–46",
      "Psalm(s) / भजन संहिता : 9:1–12"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 11, Verse 1–9",
      "Romans / रोमियों : Chapter 15, Verse 1–6",
      "Luke / लूका : Chapter 1, Verse 67–79",
      "Psalm(s) / भजन संहिता : 11"
    ],
    "lordsSupper": []
  },
  "2026-11-07": {
    "dateKey": "2026-11-07",
    "day": 7,
    "monthName": "November",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Ezekiel / यहेजकेल : Chapter 34, Verse 11–16",
      "Philippians / फिलिप्पियों : Chapter 2, Verse 1–11",
      "Matthew / मत्ती : Chapter 9, Verse 35–38",
      "Psalm(s) / भजन संहिता : 98"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 33, Verse 14–16",
      "2 Timothy / 2 तीमुथियुस : Chapter 2, Verse 1–13",
      "John / यूहन्ना : Chapter 10, Verse 7–18",
      "Psalm(s) / भजन संहिता : 46"
    ],
    "lordsSupper": []
  },
  "2026-11-08": {
    "dateKey": "2026-11-08",
    "day": 8,
    "monthName": "November",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "Unity in the Body of Christ (Unity Sunday / Communion of Churches in India)",
    "color": "Green",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 133",
      "*OT** Ezekiel / यहेजकेल : Chapter 37, Verse 15–28",
      "*NT** Ephesians / इफिसियों : Chapter 4, Verse 1–6",
      "John / यूहन्ना : Chapter 17, Verse 20–26 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 133",
      "*OT** Ezekiel / यहेजकेल : Chapter 37, Verse 15–28",
      "*NT** Ephesians / इफिसियों : Chapter 4, Verse 1–6",
      "John / यूहन्ना : Chapter 17, Verse 20–26 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह : Chapter 2, Verse 1–4",
      "Psalm(s) / भजन संहिता : 122",
      "Epistle: 1 Corinthians / 1 कुरिन्थियों : Chapter 12, Verse 12–27",
      "Gospel: John / यूहन्ना : Chapter 15, Verse 9–17"
    ]
  },
  "2026-11-09": {
    "dateKey": "2026-11-09",
    "day": 9,
    "monthName": "November",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Proverbs / नीतिवचन : Chapter 2, Verse 1–10",
      "Galatians / गलातियों : Chapter 5, Verse 13–26",
      "Luke / लूका : Chapter 10, Verse 1–12",
      "Psalm(s) / भजन संहिता : 34"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 55, Verse 1–5",
      "Romans / रोमियों : Chapter 8, Verse 1–11",
      "Mark / मरकुस : Chapter 4, Verse 26–29",
      "Psalm(s) / भजन संहिता : 91"
    ],
    "lordsSupper": []
  },
  "2026-11-10": {
    "dateKey": "2026-11-10",
    "day": 10,
    "monthName": "November",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Proverbs / नीतिवचन : Chapter 2, Verse 1–10",
      "Colossians / कुलुस्सियों : Chapter 1, Verse 9–14",
      "Matthew / मत्ती : Chapter 6, Verse 19–24",
      "Psalm(s) / भजन संहिता : 3"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 29, Verse 10–14",
      "Romans / रोमियों : Chapter 5, Verse 1–5",
      "Luke / लूका : Chapter 12, Verse 22–34",
      "Psalm(s) / भजन संहिता : 121"
    ],
    "lordsSupper": []
  },
  "2026-11-11": {
    "dateKey": "2026-11-11",
    "day": 11,
    "monthName": "November",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Amos / आमोस : Chapter 9, Verse 11–15",
      "Ephesians / इफिसियों : Chapter 1, Verse 15–23",
      "Matthew / मत्ती : Chapter 13, Verse 31–35",
      "Psalm(s) / भजन संहिता : 40"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 40, Verse 1–11",
      "2 Peter / 2 पतरस : Chapter 3, Verse 8–15a",
      "Luke / लूका : Chapter 13, Verse 18–21",
      "Psalm(s) / भजन संहिता : 107:1–16"
    ],
    "lordsSupper": []
  },
  "2026-11-12": {
    "dateKey": "2026-11-12",
    "day": 12,
    "monthName": "November",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Deuteronomy / व्यवस्थाविवरण : Chapter 10, Verse 12–22",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 4–9",
      "Mark / मरकुस : Chapter 1, Verse 14–20",
      "Psalm(s) / भजन संहिता : 119:105–112"
    ],
    "eveningWorship": [
      "Proverbs / नीतिवचन : Chapter 3, Verse 1–12",
      "2 Timothy / 2 तीमुथियुस : Chapter 3, Verse 14–17",
      "John / यूहन्ना : Chapter 12, Verse 44–50",
      "Psalm(s) / भजन संहिता : 34:11–22"
    ],
    "lordsSupper": []
  },
  "2026-11-13": {
    "dateKey": "2026-11-13",
    "day": 13,
    "monthName": "November",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Exodus / निर्गमन : Chapter 19, Verse 1–6",
      "Romans / रोमियों : Chapter 6, Verse 1–11",
      "Matthew / मत्ती : Chapter 5, Verse 13–16",
      "Psalm(s) / भजन संहिता : 84"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 60, Verse 1–6",
      "Acts / प्रेरितों के काम : Chapter 1, Verse 6–11",
      "John / यूहन्ना : Chapter 15, Verse 1–8",
      "Psalm(s) / भजन संहिता : 67"
    ],
    "lordsSupper": []
  },
  "2026-11-14": {
    "dateKey": "2026-11-14",
    "day": 14,
    "monthName": "November",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "Children's Day",
    "color": "Green",
    "morningWorship": [
      "Deuteronomy / व्यवस्थाविवरण : Chapter 6, Verse 1–9",
      "Ephesians / इफिसियों : Chapter 6, Verse 1–4",
      "Matthew / मत्ती : Chapter 10, Verse 13–16",
      "Psalm(s) / भजन संहिता : 8"
    ],
    "eveningWorship": [
      "1 Samuel / 1 शमूएल : Chapter 3, Verse 1–10",
      "1 John / 1 यूहन्ना : Chapter 3, Verse 1–3",
      "Matthew / मत्ती : Chapter 18, Verse 1–6",
      "Psalm(s) / भजन संहिता : 127"
    ],
    "lordsSupper": []
  },
  "2026-11-15": {
    "dateKey": "2026-11-15",
    "day": 15,
    "monthName": "November",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "God's Mission in the World – Our Calling (World Mission Sunday / Council for World Mission)",
    "color": "Green",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 96",
      "*OT** Isaiah / यशायाह : Chapter 6, Verse 1–8",
      "*NT** Acts / प्रेरितों के काम : Chapter 1, Verse 6–11",
      "Matthew / मत्ती : Chapter 28, Verse 16–20 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 96",
      "*OT** Isaiah / यशायाह : Chapter 6, Verse 1–8",
      "*NT** Acts / प्रेरितों के काम : Chapter 1, Verse 6–11",
      "Matthew / मत्ती : Chapter 28, Verse 16–20 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Jonah / योना : Chapter 3, Verse 1–10",
      "Psalm(s) / भजन संहिता : 67",
      "Epistle: Romans / रोमियों : Chapter 10, Verse 9–17",
      "Gospel: John / यूहन्ना : Chapter 20, Verse 19–23"
    ]
  },
  "2026-11-16": {
    "dateKey": "2026-11-16",
    "day": 16,
    "monthName": "November",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 55, Verse 10–13",
      "Hebrews / इब्रानियों : Chapter 11, Verse 1–6",
      "Luke / लूका : Chapter 6, Verse 46–49",
      "Psalm(s) / भजन संहिता : 119:89–96"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 17, Verse 5–8",
      "Matthew / मत्ती : Chapter 7, Verse 24–27",
      "Psalm(s) / भजन संहिता : 125"
    ],
    "lordsSupper": []
  },
  "2026-11-17": {
    "dateKey": "2026-11-17",
    "day": 17,
    "monthName": "November",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 40, Verse 28–31",
      "2 Corinthians / 2 कुरिन्थियों : Chapter 12, Verse 7–10",
      "Matthew / मत्ती : Chapter 11, Verse 28–30",
      "Psalm(s) / भजन संहिता : 71:1–6"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 41, Verse 8–10",
      "Romans / रोमियों : Chapter 8, Verse 31–39",
      "Luke / लूका : Chapter 12, Verse 32–34",
      "Psalm(s) / भजन संहिता : 46:1–3"
    ],
    "lordsSupper": []
  },
  "2026-11-18": {
    "dateKey": "2026-11-18",
    "day": 18,
    "monthName": "November",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Exodus / निर्गमन : Chapter 16, Verse 1–6",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 10–20",
      "Matthew / मत्ती : Chapter 6, Verse 25–34",
      "Psalm(s) / भजन संहिता : 23"
    ],
    "eveningWorship": [
      "1 Kings / 1 राजाओं : Chapter 17, Verse 8–16",
      "2 Corinthians / 2 कुरिन्थियों : Chapter 9, Verse 6–11",
      "Luke / लूका : Chapter 12, Verse 22–31",
      "Psalm(s) / भजन संहिता : 34:1–8"
    ],
    "lordsSupper": []
  },
  "2026-11-19": {
    "dateKey": "2026-11-19",
    "day": 19,
    "monthName": "November",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 54, Verse 10–13",
      "Romans / रोमियों : Chapter 8, Verse 28–39",
      "Matthew / मत्ती : Chapter 28, Verse 16–20",
      "Psalm(s) / भजन संहिता : 136:1–9"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 31, Verse 31–34",
      "Ephesians / इफिसियों : Chapter 3, Verse 14–21",
      "John / यूहन्ना : Chapter 15, Verse 9–13",
      "Psalm(s) / भजन संहिता : 103:1–5"
    ],
    "lordsSupper": []
  },
  "2026-11-20": {
    "dateKey": "2026-11-20",
    "day": 20,
    "monthName": "November",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "1 Kings / 1 राजाओं : Chapter 19, Verse 9–18",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 4–9",
      "Matthew / मत्ती : Chapter 6, Verse 5–13",
      "Psalm(s) / भजन संहिता : 46:10"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 55, Verse 6–9",
      "Romans / रोमियों : Chapter 12, Verse 1–2",
      "Mark / मरकुस : Chapter 1, Verse 35–39",
      "Psalm(s) / भजन संहिता : 62:5–8"
    ],
    "lordsSupper": []
  },
  "2026-11-21": {
    "dateKey": "2026-11-21",
    "day": 21,
    "monthName": "November",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Exodus / निर्गमन : Chapter 33, Verse 18–23",
      "2 Corinthians / 2 कुरिन्थियों : Chapter 4, Verse 1–6",
      "John / यूहन्ना : Chapter 1, Verse 14–18",
      "Psalm(s) / भजन संहिता : 96:1–9"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 60, Verse 1–3",
      "Colossians / कुलुस्सियों : Chapter 1, Verse 15–20",
      "John / यूहन्ना : Chapter 17, Verse 1–5",
      "Psalm(s) / भजन संहिता : 72:1–7"
    ],
    "lordsSupper": []
  },
  "2026-11-22": {
    "dateKey": "2026-11-22",
    "day": 22,
    "monthName": "November",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "\"Christ the Sovereign Shepherd and King of All\" (Last Sunday after Pentecost / Festival of Christ the King)",
    "color": "White",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 93:1–5",
      "*OT** Ezekiel / यहेजकेल : Chapter 34, Verse 11–16",
      "*NT** Colossians / कुलुस्सियों : Chapter 1, Verse 11–20",
      "John / यूहन्ना : Chapter 18, Verse 33–37 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 93:1–5",
      "*OT** Ezekiel / यहेजकेल : Chapter 34, Verse 11–16",
      "*NT** Colossians / कुलुस्सियों : Chapter 1, Verse 11–20",
      "John / यूहन्ना : Chapter 18, Verse 33–37 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Daniel / दानिय्येल : Chapter 7, Verse 13–14",
      "Psalm(s) / भजन संहिता : 24:1–10",
      "Epistle: Revelation / प्रकाशितवाक्य : Chapter 19, Verse 11–16",
      "Gospel: Matthew / मत्ती : Chapter 25, Verse 31–46"
    ]
  },
  "2026-11-23": {
    "dateKey": "2026-11-23",
    "day": 23,
    "monthName": "November",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Micah / मीका : Chapter 6, Verse 6–8",
      "Romans / रोमियों : Chapter 3, Verse 21–26",
      "Matthew / मत्ती : Chapter 5, Verse 3–12",
      "Psalm(s) / भजन संहिता : 103:6–12"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 61, Verse 1–3",
      "2 Corinthians / 2 कुरिन्थियों : Chapter 5, Verse 16–21",
      "Luke / लूका : Chapter 4, Verse 16–21",
      "Psalm(s) / भजन संहिता : 146:1–10"
    ],
    "lordsSupper": []
  },
  "2026-11-24": {
    "dateKey": "2026-11-24",
    "day": 24,
    "monthName": "November",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Proverbs / नीतिवचन : Chapter 2, Verse 1–9",
      "Ephesians / इफिसियों : Chapter 4, Verse 17–24",
      "Matthew / मत्ती : Chapter 7, Verse 13–14",
      "Psalm(s) / भजन संहिता : 1"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 2, Verse 1–5",
      "Philippians / फिलिप्पियों : Chapter 3, Verse 12–16",
      "Luke / लूका : Chapter 9, Verse 57–62",
      "Psalm(s) / भजन संहिता : 25:1–7"
    ],
    "lordsSupper": []
  },
  "2026-11-25": {
    "dateKey": "2026-11-25",
    "day": 25,
    "monthName": "November",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 55, Verse 10–11",
      "Hebrews / इब्रानियों : Chapter 4, Verse 12–16",
      "Matthew / मत्ती : Chapter 4, Verse 1–11",
      "Psalm(s) / भजन संहिता : 119:105–112"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 23, Verse 29–32",
      "James / याकूब : Chapter 1, Verse 19–25",
      "John / यूहन्ना : Chapter 8, Verse 31–36",
      "Psalm(s) / भजन संहिता : 119:129–136"
    ],
    "lordsSupper": []
  },
  "2026-11-26": {
    "dateKey": "2026-11-26",
    "day": 26,
    "monthName": "November",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 60, Verse 19–22",
      "Ephesians / इफिसियों : Chapter 5, Verse 1–14",
      "John / यूहन्ना : Chapter 12, Verse 35–36",
      "Psalm(s) / भजन संहिता : 27:1–4"
    ],
    "eveningWorship": [
      "Zechariah / जकर्याह : Chapter 14, Verse 6–9",
      "Philippians / फिलिप्पियों : Chapter 2, Verse 14–16",
      "Matthew / मत्ती : Chapter 5, Verse 14–16",
      "Psalm(s) / भजन संहिता : 84:1–7"
    ],
    "lordsSupper": []
  },
  "2026-11-27": {
    "dateKey": "2026-11-27",
    "day": 27,
    "monthName": "November",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 40, Verse 1–5",
      "Romans / रोमियों : Chapter 8, Verse 18–25",
      "Luke / लूका : Chapter 2, Verse 25–35",
      "Psalm(s) / भजन संहिता : 130"
    ],
    "eveningWorship": [
      "Micah / मीका : Chapter 4, Verse 6–8",
      "Hebrews / इब्रानियों : Chapter 9, Verse 24–28",
      "John / यूहन्ना : Chapter 1, Verse 9–13",
      "Psalm(s) / भजन संहिता : 147:1–6"
    ],
    "lordsSupper": []
  },
  "2026-11-28": {
    "dateKey": "2026-11-28",
    "day": 28,
    "monthName": "November",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Green",
    "morningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 29, Verse 10–14",
      "1 Peter / 1 पतरस : Chapter 1, Verse 3–9",
      "Luke / लूका : Chapter 21, Verse 25–36",
      "Psalm(s) / भजन संहिता : 39:4–7"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 40, Verse 28–31",
      "Romans / रोमियों : Chapter 15, Verse 13",
      "Matthew / मत्ती : Chapter 11, Verse 28–30",
      "Psalm(s) / भजन संहिता : 62:5"
    ],
    "lordsSupper": []
  },
  "2026-11-29": {
    "dateKey": "2026-11-29",
    "day": 29,
    "monthName": "November",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "The Hope of Christ's Coming and Our Mission in Him (4th Sunday before Christmas / Advent 1 / Inauguration of the Church of North India – CNI Day)",
    "color": "White",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 24:1–10",
      "*OT** Isaiah / यशायाह : Chapter 9, Verse 1–7",
      "*NT** Romans / रोमियों : Chapter 13, Verse 11–14",
      "Luke / लूका : Chapter 21, Verse 5–19 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 24:1–10",
      "*OT** Isaiah / यशायाह : Chapter 9, Verse 1–7",
      "*NT** Romans / रोमियों : Chapter 13, Verse 11–14",
      "Luke / लूका : Chapter 21, Verse 5–19 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 33, Verse 14–16",
      "Psalm(s) / भजन संहिता : 85:1–13",
      "Epistle: 1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 5, Verse 1–11",
      "Gospel: Luke / लूका : Chapter 21, Verse 5–19"
    ]
  },
  "2026-11-30": {
    "dateKey": "2026-11-30",
    "day": 30,
    "monthName": "November",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Red",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 49, Verse 1–6",
      "Ephesians / इफिसियों : Chapter 4, Verse 11–13",
      "John / यूहन्ना : Chapter 1, Verse 35–42",
      "Psalm(s) / भजन संहिता : 139:1–6"
    ],
    "eveningWorship": [
      "Zechariah / जकर्याह : Chapter 8, Verse 1–8",
      "1 Corinthians / 1 कुरिन्थियों : Chapter 9, Verse 16–23",
      "Matthew / मत्ती : Chapter 4, Verse 18–22",
      "Psalm(s) / भजन संहिता : 100",
      "*DECEMBER 2026**"
    ],
    "lordsSupper": []
  },
  "2026-12-01": {
    "dateKey": "2026-12-01",
    "day": 1,
    "monthName": "December",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 52, Verse 7–10",
      "Romans / रोमियों : Chapter 10, Verse 14–17",
      "Matthew / मत्ती : Chapter 28, Verse 16–20",
      "Psalm(s) / भजन संहिता : 96"
    ],
    "eveningWorship": [
      "Deuteronomy / व्यवस्थाविवरण : Chapter 6, Verse 1–9",
      "2 Timothy / 2 तीमुथियुस : Chapter 2, Verse 1–7",
      "John / यूहन्ना : Chapter 12, Verse 12–26",
      "Psalm(s) / भजन संहिता : 67"
    ],
    "lordsSupper": []
  },
  "2026-12-02": {
    "dateKey": "2026-12-02",
    "day": 2,
    "monthName": "December",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 40, Verse 1–11",
      "Philippians / फिलिप्पियों : Chapter 10, Verse 14–17",
      "Mark / मरकुस : Chapter 1, Verse 1–8",
      "Psalm(s) / भजन संहिता : 85"
    ],
    "eveningWorship": [
      "Micah / मीका : Chapter 5, Verse 1–5",
      "Colossians / कुलुस्सियों : Chapter 1, Verse 15–23",
      "Luke / लूका : Chapter 1, Verse 5–25",
      "Psalm(s) / भजन संहिता : 80"
    ],
    "lordsSupper": []
  },
  "2026-12-03": {
    "dateKey": "2026-12-03",
    "day": 3,
    "monthName": "December",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Francis Xavier (Evangelist)",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 6, Verse 1–8",
      "Acts / प्रेरितों के काम : Chapter 13, Verse 44–49",
      "Matthew / मत्ती : Chapter 9, Verse 35 – Chapter 10, Verse 8",
      "Psalm(s) / भजन संहिता : 98"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 1, Verse 4–10",
      "Romans / रोमियों : Chapter 15, Verse 18–21",
      "Luke / लूका : Chapter 10, Verse 1–12",
      "Psalm(s) / भजन संहिता : 117"
    ],
    "lordsSupper": []
  },
  "2026-12-04": {
    "dateKey": "2026-12-04",
    "day": 4,
    "monthName": "December",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Clement of Alexandria (Theologian)",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 7, Verse 10–14",
      "Philippians / फिलिप्पियों : Chapter 2, Verse 1–8",
      "John / यूहन्ना : Chapter 1, Verse 1–14",
      "Psalm(s) / भजन संहिता : 8:1–5"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 9, Verse 1–6",
      "1 Timothy / 1 तीमुथियुस : Chapter 3, Verse 10–16",
      "Matthew / मत्ती : Chapter 1, Verse 20–23",
      "Psalm(s) / भजन संहिता : 8:6–10"
    ],
    "lordsSupper": []
  },
  "2026-12-05": {
    "dateKey": "2026-12-05",
    "day": 5,
    "monthName": "December",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 60, Verse 1–6",
      "1 Peter / 1 पतरस : Chapter 1, Verse 3–9",
      "Luke / लूका : Chapter 1, Verse 26–38",
      "Psalm(s) / भजन संहिता : 42"
    ],
    "eveningWorship": [
      "Malachi / मलाकी : Chapter 3, Verse 1–4",
      "Hebrews / इब्रानियों : Chapter 10, Verse 19–25",
      "Matthew / मत्ती : Chapter 24, Verse 32–44",
      "Psalm(s) / भजन संहिता : 43"
    ],
    "lordsSupper": []
  },
  "2026-12-06": {
    "dateKey": "2026-12-06",
    "day": 6,
    "monthName": "December",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "Prepare the Way of the Lord (3rd Sunday before Christmas / Advent 2)",
    "color": "Violet",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 85:1–13",
      "*OT** Malachi / मलाकी : Chapter 3, Verse 1–4",
      "*NT** 2 Peter / 2 पतरस : Chapter 3, Verse 8–18",
      "Mark / मरकुस : Chapter 1, Verse 1–8 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 85:1–13",
      "*OT** Malachi / मलाकी : Chapter 3, Verse 1–4",
      "*NT** 2 Peter / 2 पतरस : Chapter 3, Verse 8–18",
      "Mark / मरकुस : Chapter 1, Verse 1–8 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह : Chapter 40, Verse 1–11",
      "Psalm(s) / भजन संहिता : 72:1–19",
      "Epistle: Philippians / फिलिप्पियों : Chapter 1, Verse 3–11",
      "Gospel: Luke / लूका : Chapter 3, Verse 1–6"
    ]
  },
  "2026-12-07": {
    "dateKey": "2026-12-07",
    "day": 7,
    "monthName": "December",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 35, Verse 1–10",
      "James / याकूब : Chapter 5, Verse 7–11",
      "Matthew / मत्ती : Chapter 11, Verse 2–11",
      "Psalm(s) / भजन संहिता : 122"
    ],
    "eveningWorship": [
      "Zephaniah / सपन्याह : Chapter 3, Verse 14–20",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 4–7",
      "Luke / लूका : Chapter 7, Verse 18–23",
      "Psalm(s) / भजन संहिता : 124"
    ],
    "lordsSupper": []
  },
  "2026-12-08": {
    "dateKey": "2026-12-08",
    "day": 8,
    "monthName": "December",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 9, Verse 2–7",
      "Romans / रोमियों : Chapter 15, Verse 4–13",
      "John / यूहन्ना : Chapter 3, Verse 16–21",
      "Psalm(s) / भजन संहिता : 27"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 29, Verse 17–24",
      "Hebrews / इब्रानियों : Chapter 12, Verse 1–11",
      "John / यूहन्ना : Chapter 8, Verse 12–20",
      "Psalm(s) / भजन संहिता : 40"
    ],
    "lordsSupper": []
  },
  "2026-12-09": {
    "dateKey": "2026-12-09",
    "day": 9,
    "monthName": "December",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 7, Verse 10–17",
      "Romans / रोमियों : Chapter 1, Verse 1–7",
      "Matthew / मत्ती : Chapter 1, Verse 18–25",
      "Psalm(s) / भजन संहिता : 30"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 33, Verse 14–22",
      "Galatians / गलातियों : Chapter 3, Verse 23 – Chapter 4, Verse 7",
      "Luke / लूका : Chapter 1, Verse 39–56",
      "Psalm(s) / भजन संहिता : 132"
    ],
    "lordsSupper": []
  },
  "2026-12-10": {
    "dateKey": "2026-12-10",
    "day": 10,
    "monthName": "December",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Micah / मीका : Chapter 5, Verse 2–5a",
      "Titus / तीतुस : Chapter 2, Verse 11–14",
      "Luke / लूका : Chapter 2, Verse 1–14",
      "Psalm(s) / भजन संहिता : 123"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 52, Verse 7–10",
      "Hebrews / इब्रानियों : Chapter 1, Verse 1–4",
      "John / यूहन्ना : Chapter 1, Verse 14–18",
      "Psalm(s) / भजन संहिता : 125"
    ],
    "lordsSupper": []
  },
  "2026-12-11": {
    "dateKey": "2026-12-11",
    "day": 11,
    "monthName": "December",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 61, Verse 1–4, 8–11",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 5, Verse 16–24",
      "John / यूहन्ना : Chapter 1, Verse 6–8, 19–28",
      "Psalm(s) / भजन संहिता : 18:1–6"
    ],
    "eveningWorship": [
      "Zechariah / जकर्याह : Chapter 9, Verse 9–10",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 4–9",
      "Luke / लूका : Chapter 3, Verse 7–18",
      "Psalm(s) / भजन संहिता : 126"
    ],
    "lordsSupper": []
  },
  "2026-12-12": {
    "dateKey": "2026-12-12",
    "day": 12,
    "monthName": "December",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 11, Verse 1–10",
      "Romans / रोमियों : Chapter 15, Verse 4–13",
      "Matthew / मत्ती : Chapter 1, Verse 1–17",
      "Psalm(s) / भजन संहिता : 24"
    ],
    "eveningWorship": [
      "Genesis / उत्पत्ति : Chapter 22, Verse 15–18",
      "Galatians / गलातियों : Chapter 4, Verse 4–7",
      "Luke / लूका : Chapter 1, Verse 57–66",
      "Psalm(s) / भजन संहिता : 89:1–4"
    ],
    "lordsSupper": []
  },
  "2026-12-13": {
    "dateKey": "2026-12-13",
    "day": 13,
    "monthName": "December",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "Rejoice, the Lord is Near (2nd Sunday before Christmas / Advent 3)",
    "color": "Violet",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 126",
      "*OT** Isaiah / यशायाह : Chapter 61, Verse 1–11",
      "*NT** 1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 5, Verse 16–24",
      "Luke / लूका : Chapter 21, Verse 29–36 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 126",
      "*OT** Isaiah / यशायाह : Chapter 61, Verse 1–11",
      "*NT** 1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 5, Verse 16–24",
      "Luke / लूका : Chapter 21, Verse 29–36 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Zephaniah / सपन्याह : Chapter 3, Verse 14–20",
      "Psalm(s) / भजन संहिता : 25",
      "Epistle: Philippians / फिलिप्पियों : Chapter 4, Verse 4–7",
      "Gospel: Matthew / मत्ती : Chapter 24, Verse 32–44"
    ]
  },
  "2026-12-14": {
    "dateKey": "2026-12-14",
    "day": 14,
    "monthName": "December",
    "year": 2026,
    "dayName": "Monday",
    "theme": "Gopinath Nandi (Convert, Confessor), baptized 1832",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 12, Verse 1–6",
      "Romans / रोमियों : Chapter 10, Verse 8–13",
      "Matthew / मत्ती : Chapter 10, Verse 16–22",
      "Psalm(s) / भजन संहिता : 66"
    ],
    "eveningWorship": [
      "Ezekiel / यहेजकेल : Chapter 36, Verse 24–28",
      "Acts / प्रेरितों के काम : Chapter 11, Verse 1–18",
      "Luke / लूका : Chapter 15, Verse 1–10",
      "Psalm(s) / भजन संहिता : 115"
    ],
    "lordsSupper": []
  },
  "2026-12-15": {
    "dateKey": "2026-12-15",
    "day": 15,
    "monthName": "December",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 40, Verse 27–31",
      "Hebrews / इब्रानियों : Chapter 6, Verse 13–20",
      "John / यूहन्ना : Chapter 5, Verse 30–40",
      "Psalm(s) / भजन संहिता : 33"
    ],
    "eveningWorship": [
      "Exodus / निर्गमन : Chapter 3, Verse 1–12",
      "Hebrews / इब्रानियों : Chapter 3, Verse 1–6",
      "Luke / लूका : Chapter 20, Verse 9–19",
      "Psalm(s) / भजन संहिता : 103"
    ],
    "lordsSupper": []
  },
  "2026-12-16": {
    "dateKey": "2026-12-16",
    "day": 16,
    "monthName": "December",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 35, Verse 1–10",
      "James / याकूब : Chapter 5, Verse 7–10",
      "Luke / लूका : Chapter 1, Verse 25–30",
      "Psalm(s) / भजन संहिता : 146"
    ],
    "eveningWorship": [
      "Micah / मीका : Chapter 4, Verse 1–5",
      "Romans / रोमियों : Chapter 13, Verse 8–14",
      "Matthew / मत्ती : Chapter 11, Verse 25–30",
      "Psalm(s) / भजन संहिता : 89:19–29"
    ],
    "lordsSupper": []
  },
  "2026-12-17": {
    "dateKey": "2026-12-17",
    "day": 17,
    "monthName": "December",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "Ignatius of Antioch (Bishop, Theologian, Martyr), c. 107",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 43, Verse 1–7",
      "Romans / रोमियों : Chapter 8, Verse 31–39",
      "John / यूहन्ना : Chapter 12, Verse 24–26",
      "Psalm(s) / भजन संहिता : 116:1–9"
    ],
    "eveningWorship": [
      "Job / अय्यूब : Chapter 3, Verse 1–9",
      "1 Peter / 1 पतरस : Chapter 4, Verse 12–19",
      "Luke / लूका : Chapter 9, Verse 23–27",
      "Psalm(s) / भजन संहिता : 115 (or Isaiah 35:1–10)"
    ],
    "lordsSupper": []
  },
  "2026-12-18": {
    "dateKey": "2026-12-18",
    "day": 18,
    "monthName": "December",
    "year": 2026,
    "dayName": "Friday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Zechariah / जकर्याह : Chapter 8, Verse 1–8",
      "Philippians / फिलिप्पियों : Chapter 4, Verse 4–7",
      "Luke / लूका : Chapter 12, Verse 22–34",
      "Psalm(s) / भजन संहिता : 37:1–11"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 30, Verse 18–26",
      "Hebrews / इब्रानियों : Chapter 10, Verse 19–25",
      "John / यूहन्ना : Chapter 14, Verse 1–7",
      "Psalm(s) / भजन संहिता : 27:1–6"
    ],
    "lordsSupper": []
  },
  "2026-12-19": {
    "dateKey": "2026-12-19",
    "day": 19,
    "monthName": "December",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 11, Verse 1–10",
      "Romans / रोमियों : Chapter 15, Verse 7–13",
      "Matthew / मत्ती : Chapter 3, Verse 1–12",
      "Psalm(s) / भजन संहिता : 85:1–7"
    ],
    "eveningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 33, Verse 14–16",
      "2 Peter / 2 पतरस : Chapter 3, Verse 8–13",
      "Luke / लूका : Chapter 1, Verse 67–79",
      "Psalm(s) / भजन संहिता : 89:1–8"
    ],
    "lordsSupper": []
  },
  "2026-12-20": {
    "dateKey": "2026-12-20",
    "day": 20,
    "monthName": "December",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "God With Us – Hope of All Nations (Sunday before Christmas / Advent 4)",
    "color": "Violet",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 80:1–12",
      "*OT** Isaiah / यशायाह : Chapter 7, Verse 10–17",
      "*NT** Romans / रोमियों : Chapter 1, Verse 1–7",
      "Matthew / मत्ती : Chapter 1, Verse 18–25 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 80:1–12",
      "*OT** Isaiah / यशायाह : Chapter 7, Verse 10–17",
      "*NT** Romans / रोमियों : Chapter 1, Verse 1–7",
      "Matthew / मत्ती : Chapter 1, Verse 18–25 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Micah / मीका : Chapter 5, Verse 1–9",
      "Psalm(s) / भजन संहिता : 24",
      "Epistle: Hebrews / इब्रानियों : Chapter 10, Verse 5–10",
      "Gospel: Luke / लूका : Chapter 1, Verse 39–56"
    ]
  },
  "2026-12-21": {
    "dateKey": "2026-12-21",
    "day": 21,
    "monthName": "December",
    "year": 2026,
    "dayName": "Monday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Genesis / उत्पत्ति : Chapter 49, Verse 1–10",
      "Revelation / प्रकाशितवाक्य : Chapter 3, Verse 7–13",
      "Luke / लूका : Chapter 1, Verse 5–25",
      "Psalm(s) / भजन संहिता : 130"
    ],
    "eveningWorship": [
      "2 Samuel / 2 शमूएल : Chapter 7, Verse 1–17",
      "Romans / रोमियों : Chapter 16, Verse 25–27",
      "Luke / लूका : Chapter 1, Verse 26–38",
      "Psalm(s) / भजन संहिता : 126"
    ],
    "lordsSupper": []
  },
  "2026-12-22": {
    "dateKey": "2026-12-22",
    "day": 22,
    "monthName": "December",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 9, Verse 1–7",
      "Philippians / फिलिप्पियों : Chapter 2, Verse 1–11",
      "Luke / लूका : Chapter 1, Verse 39–45",
      "Psalm(s) / भजन संहिता : 132:1–10"
    ],
    "eveningWorship": [
      "Zephaniah / सपन्याह : Chapter 3, Verse 14–20",
      "Colossians / कुलुस्सियों : Chapter 3, Verse 12–17",
      "Luke / लूका : Chapter 1, Verse 46–56",
      "Psalm(s) / भजन संहिता : 147:1–11"
    ],
    "lordsSupper": []
  },
  "2026-12-23": {
    "dateKey": "2026-12-23",
    "day": 23,
    "monthName": "December",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "Violet",
    "morningWorship": [
      "Malachi / मलाकी : Chapter 3, Verse 1–4",
      "Ephesians / इफिसियों : Chapter 2, Verse 11–22",
      "Luke / लूका : Chapter 1, Verse 57–66",
      "Psalm(s) / भजन संहिता : 98"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 52, Verse 7–10",
      "Hebrews / इब्रानियों : Chapter 1, Verse 1–4",
      "Luke / लूका : Chapter 1, Verse 67–80",
      "Psalm(s) / भजन संहिता : 33:1–5, 20–22"
    ],
    "lordsSupper": []
  },
  "2026-12-24": {
    "dateKey": "2026-12-24",
    "day": 24,
    "monthName": "December",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "The Light Shines in the Darkness (Christmas Eve) — reflecting John 1:1–14 and Luke 2:1–14; the birth of Christ brings hope into a darkened world",
    "color": "White",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 9, Verse 2–7",
      "Titus / तीतुस : Chapter 2, Verse 11–14",
      "Luke / लूका : Chapter 2, Verse 1–14",
      "Psalm(s) / भजन संहिता : 89:1–4, 19–26"
    ],
    "eveningWorship": [
      "Micah / मीका : Chapter 5, Verse 2–5a",
      "1 John / 1 यूहन्ना : Chapter 4, Verse 7–16",
      "John / यूहन्ना : Chapter 1, Verse 1–14",
      "Psalm(s) / भजन संहिता : 96"
    ],
    "lordsSupper": []
  },
  "2026-12-25": {
    "dateKey": "2026-12-25",
    "day": 25,
    "monthName": "December",
    "year": 2026,
    "dayName": "Friday",
    "theme": "Glory to God in the Highest (Christmas Day) — focus on the incarnation of Christ, emphasizing God's glory revealed in Jesus",
    "color": "White",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 98",
      "*OT** Micah / मीका : Chapter 5, Verse 1–5",
      "*NT** Hebrews / इब्रानियों : Chapter 1, Verse 1–4",
      "John / यूहन्ना : Chapter 1, Verse 1–14 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 98",
      "*OT** Micah / मीका : Chapter 5, Verse 1–5",
      "*NT** Hebrews / इब्रानियों : Chapter 1, Verse 1–4",
      "John / यूहन्ना : Chapter 1, Verse 1–14 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Isaiah / यशायाह : Chapter 9, Verse 1–7",
      "Psalm(s) / भजन संहिता : 97",
      "Epistle: Galatians / गलातियों : Chapter 4, Verse 1–7",
      "Gospel: Luke / लूका : Chapter 2, Verse 8–20"
    ]
  },
  "2026-12-26": {
    "dateKey": "2026-12-26",
    "day": 26,
    "monthName": "December",
    "year": 2026,
    "dayName": "Saturday",
    "theme": "",
    "color": "White",
    "morningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 26, Verse 1–9",
      "Acts / प्रेरितों के काम : Chapter 6, Verse 8–15",
      "Matthew / मत्ती : Chapter 10, Verse 16–22",
      "Psalm(s) / भजन संहिता : 31:1–5"
    ],
    "eveningWorship": [
      "2 Chronicles / 2 इतिहास : Chapter 24, Verse 17–22",
      "Acts / प्रेरितों के काम : Chapter 7, Verse 51–60",
      "Luke / लूका : Chapter 21, Verse 10–19",
      "Psalm(s) / भजन संहिता : 31:6–16"
    ],
    "lordsSupper": []
  },
  "2026-12-27": {
    "dateKey": "2026-12-27",
    "day": 27,
    "monthName": "December",
    "year": 2026,
    "dayName": "Sunday",
    "theme": "The Word Became Flesh (1st Sunday after Christmas)",
    "color": "White",
    "morningWorship": [
      "Psalm(s) / भजन संहिता : 147:12–20",
      "*OT** Isaiah / यशायाह : Chapter 60, Verse 16–22",
      "*NT** Habakkuk / हबक्कूक : Chapter 7, Verse 4–10",
      "Luke / लूका : Chapter 2, Verse 22–40 (and/or Gospel)"
    ],
    "eveningWorship": [
      "Psalm(s) / भजन संहिता : 147:12–20",
      "*OT** Isaiah / यशायाह : Chapter 60, Verse 16–22",
      "*NT** Habakkuk / हबक्कूक : Chapter 7, Verse 4–10",
      "Luke / लूका : Chapter 2, Verse 22–40 (and/or Gospel)"
    ],
    "lordsSupper": [
      "*OT** Jeremiah / यिर्मयाह : Chapter 31, Verse 7–14",
      "Psalm(s) / भजन संहिता : 147:12–20",
      "Epistle: Ephesians / इफिसियों : Chapter 1, Verse 3–14",
      "Gospel: John / यूहन्ना : Chapter 1, Verse 1–18"
    ]
  },
  "2026-12-28": {
    "dateKey": "2026-12-28",
    "day": 28,
    "monthName": "December",
    "year": 2026,
    "dayName": "Monday",
    "theme": "The Holy Innocents / Krishna Pal (Convert, Baptist), baptized 1800",
    "color": "Red",
    "morningWorship": [
      "Jeremiah / यिर्मयाह : Chapter 31, Verse 15–17",
      "Revelation / प्रकाशितवाक्य : Chapter 21, Verse 1–7",
      "Matthew / मत्ती : Chapter 2, Verse 13–18",
      "Psalm(s) / भजन संहिता : 124"
    ],
    "eveningWorship": [
      "Genesis / उत्पत्ति : Chapter 4, Verse 1–10",
      "Romans / रोमियों : Chapter 8, Verse 18–25",
      "Luke / लूका : Chapter 18, Verse 15–17",
      "Psalm(s) / भजन संहिता : 11"
    ],
    "lordsSupper": []
  },
  "2026-12-29": {
    "dateKey": "2026-12-29",
    "day": 29,
    "monthName": "December",
    "year": 2026,
    "dayName": "Tuesday",
    "theme": "",
    "color": "White",
    "morningWorship": [
      "Isaiah / यशायाह : Chapter 12, Verse 1–6",
      "Colossians / कुलुस्सियों : Chapter 1, Verse 9–20",
      "Luke / लूका : Chapter 2, Verse 41–52",
      "Psalm(s) / भजन संहिता : 96"
    ],
    "eveningWorship": [
      "Isaiah / यशायाह : Chapter 45, Verse 22–25",
      "Revelation / प्रकाशितवाक्य : Chapter 21, Verse 22–27",
      "John / यूहन्ना : Chapter 1, Verse 1–18",
      "Psalm(s) / भजन संहिता : 97"
    ],
    "lordsSupper": []
  },
  "2026-12-30": {
    "dateKey": "2026-12-30",
    "day": 30,
    "monthName": "December",
    "year": 2026,
    "dayName": "Wednesday",
    "theme": "",
    "color": "White",
    "morningWorship": [
      "Exodus / निर्गमन : Chapter 33, Verse 12–23",
      "1 John / 1 यूहन्ना : Chapter 1, Verse 1–5",
      "John / यूहन्ना : Chapter 21, Verse 19b–24",
      "Psalm(s) / भजन संहिता : 98"
    ],
    "eveningWorship": [
      "Ecclesiastes / सभोपदेशक : Chapter 3, Verse 1–13",
      "Revelation / प्रकाशितवाक्य : Chapter 21, Verse 1–6",
      "Matthew / मत्ती : Chapter 25, Verse 31–46",
      "Psalm(s) / भजन संहिता : 8"
    ],
    "lordsSupper": []
  },
  "2026-12-31": {
    "dateKey": "2026-12-31",
    "day": 31,
    "monthName": "December",
    "year": 2026,
    "dayName": "Thursday",
    "theme": "God's Faithfulness Through the Times (New Year's Eve) — pointing to hope, trust, and assurance as the year ends and a new one begins",
    "color": "White",
    "morningWorship": [
      "Exodus / निर्गमन : Chapter 15, Verse 2–13",
      "Romans / रोमियों : Chapter 8, Verse 31–39",
      "Matthew / मत्ती : Chapter 6, Verse 25–34",
      "Psalm(s) / भजन संहिता : 90:1–12"
    ],
    "eveningWorship": [
      "Ecclesiastes / सभोपदेशक : Chapter 3, Verse 1–15",
      "1 Thessalonians / 1 थिस्सलुनीकियों : Chapter 5, Verse 1–22",
      "Luke / लूका : Chapter 17, Verse 11–19",
      "Psalm(s) / भजन संहिता : 96"
    ],
    "lordsSupper": []
  }
},

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

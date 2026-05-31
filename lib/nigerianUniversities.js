const universitiesByState = {
  'Abia': [
    // Federal
    'Michael Okpara University of Agriculture, Umudike',
    // State
    'Abia State University, Uturu',
    // Private
    'Gregory University, Uturu',
    'Rhema University, Aba',
    'Clifford University, Owerrinta',
    'Spiritan University, Nneochi',
    'Nigerian British University, Asa',
    'Amadeus University, Amizi',
    'Lux Mundi University, Umuahia',
  ],
  'Adamawa': [
    // Federal
    'Modibbo Adama University of Technology, Yola',
    'Federal University of Agriculture, Mubi',
    // State
    'Adamawa State University, Mubi',
    // Private
    'American University of Nigeria, Yola',
  ],
  'Akwa Ibom': [
    // Federal
    'University of Uyo',
    'Federal University of Technology, Ikot Abasi',
    'University of Maritime Studies, Oron',
    // State
    'Akwa Ibom State University, Ikot Akpaden',
    // Private
    'Obong University, Obong Ntak',
    'Ritman University, Ikot Ekpene',
    'Topfaith University, Mkpatak',
    'Southern Atlantic University, Uyo',
  ],
  'Anambra': [
    // Federal
    'Nnamdi Azikiwe University, Awka',
    // State
    'Chukwuemeka Odumegwu Ojukwu University, Uli',
    // Private
    'Madonna University, Okija',
    'Paul University, Awka',
    'Tansian University, Umunya',
    'Legacy University, Okija',
    'Peter University, Achina-Onneh',
    'University on the Niger, Umunya',
    'Shanahan University, Onitsha',
  ],
  'Bauchi': [
    // Federal
    'Abubakar Tafawa Balewa University, Bauchi',
    'Federal University of Health Sciences, Azare',
    // State
    'Bauchi State University, Gadau',
    // Private
  ],
  'Bayelsa': [
    // Federal
    'Federal University, Otuoke',
    'Federal University of Agriculture, Bassam-Biri',
    // State
    'Niger Delta University, Yenagoa',
    'Bayelsa Medical University, Yenagoa',
    'University of Africa, Toru Orua',
    // Private
    'Hensard University, Toru-Orua',
  ],
  'Benue': [
    // Federal
    'Joseph Sarwuan Tarka University, Makurdi',
    'Federal University of Health Sciences, Otukpo',
    // State
    'Benue State University, Makurdi',
    'Benue State University of Agriculture Science and Technology, Ihugh',
    // Private
    'University of Mkar, Mkar',
  ],
  'Borno': [
    // Federal
    'University of Maiduguri',
    'Nigerian Army University, Biu',
    // State
    'Kashim Ibrahim University, Maiduguri',
    // Private
    'Al-Ansar University, Maiduguri',
  ],
  'Cross River': [
    // Federal
    'University of Calabar',
    // State
    'University of Cross River State, Calabar',
    'Cross River University of Education and Entrepreneurship, Akampa',
    // Private
    'Arthur Jarvis University, Akpabuyo',
    'British Canadian University, Obudu',
    'Havilla University, Nde-Ikom',
    'The Duke Medical University, Calabar',
  ],
  'Delta': [
    // Federal
    'Federal University of Petroleum Resources, Effurun',
    'Nigerian Maritime University, Okerenkoko',
    'Admiralty University, Ibusa',
    'Federal University of Health Sciences, Kwale',
    // State
    'Delta State University, Abraka',
    'Delta State University of Science and Technology, Ozoro',
    'University of Delta, Agbor',
    'Dennis Osadebe University, Asaba',
    // Private
    'Novena University, Ogume',
    'Western Delta University, Oghara',
    'Edwin Clark University, Kiagbodo',
    'Michael and Cecilia Ibru University, Agbarha-Otor',
    'Margaret Lawrence University, Galilee',
    'Sports University, Idumuje Ugboko',
  ],
  'Ebonyi': [
    // Federal
    'Alex Ekwueme Federal University, Ndufu-Alike',
    'David Umahi Federal University of Medical Sciences, Uburu',
    // State
    'Ebonyi State University, Abakaliki',
    'Ebonyi State University of ICT, Science and Technology, Oferekpe',
    'University of Aeronautics and Aerospace Engineering, Ezza',
    // Private
    'Evangel University, Akaeze',
  ],
  'Edo': [
    // Federal
    'University of Benin',
    // State
    'Ambrose Alli University, Ekpoma',
    'Edo State University, Iyamho',
    // Private
    'Benson Idahosa University, Benin City',
    'Igbinedion University, Okada',
    'Samuel Adegboyega University, Ogwa',
    'Wellspring University, Irhihi-Ogwashi',
    'Mudiame University, Irrua',
    'Tonnie Iredia University of Communication, Benin',
    'Lighthouse University, Benin City',
  ],
  'Ekiti': [
    // Federal
    'Federal University, Oye-Ekiti',
    'Federal University of Technology and Environmental Studies, Iyin-Ekiti',
    // State
    'Ekiti State University, Ado-Ekiti',
    'Bamidele Olumilua University of Science and Technology, Ikere',
    // Private
    'Afe Babalola University, Ado-Ekiti',
    'Venite University, Iloro-Ekiti',
    'Hillside University of Science and Technology, Okemesi Ekiti',
  ],
  'Enugu': [
    // Federal
    'University of Nigeria, Nsukka',
    'Federal University of Allied Health Sciences, Enugu',
    // State
    'Enugu State University of Science and Technology, Enugu',
    'State University of Medical and Applied Sciences, Igbo-Eno',
    // Private
    'Caritas University, Enugu',
    'Godfrey Okoye University, Ugwuomu-Nike',
    'Renaissance University, Ugbawka',
    'Coal City University, Enugu',
    'Kevin Ezeh University, Mgbowo',
    'Peaceland University, Enugu',
    'Maduka University, Ekwegbe',
  ],
  'FCT (Abuja)': [
    // Federal
    'National Open University of Nigeria, Abuja',
    'University of Abuja',
    'African Aviation and Aerospace University, Abuja',
    'National University of Science and Technology, Abuja',
    // State (none for FCT)
    // Private
    'Baze University, Abuja',
    'Nile University of Nigeria, Abuja',
    'Veritas University, Abuja',
    'African University of Science and Technology, Abuja',
    'Miva Open University, Abuja',
    'Leadership University, Abuja',
    'Eranova University, Kuje',
    'Philomath University, Kuje',
    'Canadian University of Nigeria, Abuja',
    'Cosmopolitan University, Abuja',
    'Amaj University, Abuja',
    'Prime University, Abuja',
    'Al-Muhibbah Open University, Abuja',
    'European University of Nigeria, Abuja',
  ],
  'Gombe': [
    // Federal
    'Federal University, Kashere',
    // State
    'Gombe State University',
    // Private
    'Pen Resource University, Gombe',
    'Jewel University, Gombe',
  ],
  'Imo': [
    // Federal
    'Federal University of Technology, Owerri',
    'Alvan Ikoku Federal University of Education, Owerri',
    // State
    'Imo State University, Owerri',
    'Kingsley Ozumba Mbadiwe University, Ogboko',
    'University of Agriculture and Environmental Sciences, Umuagwo',
    'University of Innovation, Science and Technology, Omuma',
    // Private
    'Hezekiah University, Umudi',
    'Claretian University of Nigeria, Nekede',
    'Eastern Palm University, Ogboko',
    'Bridget University Mbaise, Okirika-Nweke',
    'Azione Verde University, Amaigbo',
    'Maranatha University, Mgbidi',
  ],
  'Jigawa': [
    // Federal
    'Federal University, Dutse',
    'Federal University of Technology, Babura',
    // State
    'Sule Lamido University, Kafin Hausa',
    // Private
    'Khadija University, Majia',
  ],
  'Kaduna': [
    // Federal
    'Ahmadu Bello University, Zaria',
    'Nigerian Defence Academy, Kaduna',
    'Air Force Institute of Technology, Kaduna',
    'Federal University of Education, Zaria',
    'Federal University of Applied Sciences, Kachia',
    // State
    'Kaduna State University, Kaduna',
    // Private
    'Greenfield University, Kaduna',
    'NOK University, Kachia',
    'Tazkiyah University, Kaduna',
    'Franco British International University, Kaduna',
    'College of Petroleum and Energy Studies, Kaduna',
  ],
  'Kano': [
    // Federal
    'Bayero University, Kano',
    'Nigeria Police Academy, Wudil',
    'Yusuf Maitama Sule Federal University of Education, Kano',
    // State
    'Aliko Dangote University of Science and Technology, Wudil',
    'Northwest University, Kano',
    // Private
    'Skyline University, Kano',
    'Khalifa Isiyaku Rabiu University (KHAIR), Kano',
    'Maryam Abacha American University of Nigeria, Kano',
    'Capital City University, Kano',
    'Azman University, Kano',
    'Al-Istiqama University, Sumaila',
    'Baba-Ahmed University, Kano',
    'Elrazi University of Medical Sciences, Kano',
  ],
  'Katsina': [
    // Federal
    'Federal University, Dutsin-Ma',
    'Federal University of Transportation, Daura',
    'Federal University of Health Sciences, Katsina',
    // State
    'Umaru Musa Yar\'Adua University, Katsina',
    // Private
    'Al-Qalam University, Katsina',
  ],
  'Kebbi': [
    // Federal
    'Federal University, Birnin Kebbi',
    'Federal University of Agriculture, Zuru',
    // State
    'Kebbi State University of Science and Technology, Aliero',
    // Private
    'Rayhaan University, Aliero',
  ],
  'Kogi': [
    // Federal
    'Federal University, Lokoja',
    // State
    'Prince Abubakar Audu University, Anyigba',
    'Confluence University of Science and Technology, Osara',
    'Kogi State University, Kabba',
    // Private
    'Salem University, Lokoja',
    'Al-Bayan University, Kogi',
  ],
  'Kwara': [
    // Federal
    'University of Ilorin',
    // State
    'Kwara State University, Ilorin',
    'Kwara State University of Education, Ilorin',
    // Private
    'Al-Hikmah University, Ilorin',
    'Landmark University, Omu-Aran',
    'Lens University, Ilemona',
    'Abdulrasaq Abubakar Toyin University, Ganmo',
    'Jimoh Babalola University, Ilorin',
    'Summit University, Offa',
    'Thomas Adewumi University, Oko-Irese',
    'Ahman Pategi University, Patigi',
    'University of Offa, Offa',
    'Muhammad Kamalud-Deen University, Ilorin',
  ],
  'Lagos': [
    // Federal
    'University of Lagos',
    // State
    'Lagos State University, Ojo',
    'Lagos State University of Education, Ijanikin',
    'Lagos State University of Science and Technology, Ikorodu',
    // Private
    'Caleb University, Imota',
    'Pan-Atlantic University, Lekki',
    'Anchor University, Ayobo-Ipaja',
    'Augustine University, Ilara',
    'Eko University of Medical and Health Sciences, Ijanikin',
    'Unique Open University, Ojo',
    'Isaac Balami University of Aeronautics and Management, Lagos',
    'James Hope University, Lekki',
    'Nigerian University of Technology and Management, Apapa',
    'Maranatha University, Lekki',
  ],
  'Nasarawa': [
    // Federal
    'Federal University, Lafia',
    // State
    'Nasarawa State University, Keffi',
    // Private
    'Bingham University, Karu',
    'Ave Maria University, Piyanko',
    'Mewar International University, Masaka',
    'Phoenix University, Agwada',
  ],
  'Niger': [
    // Federal
    'Federal University of Technology, Minna',
    'Federal University of Education, Kontagora',
    // State
    'Ibrahim Badamasi Babangida University, Lapai',
    'AbdulKadir Kure University, Minna',
    'Abdulsalam Abubakar University of Agriculture and Climate Action, Mokwa',
    // Private
    'Edusoko University, Bida',
    'JEFAP University, Suleja',
    'Newgate University, Minna',
    'El-Amin University, Bida',
  ],
  'Ogun': [
    // Federal
    'Federal University of Agriculture, Abeokuta',
    'Federal University of Medicine and Medical Sciences, Abeokuta',
    'Tai Solarin Federal University of Education, Ijagun',
    // State
    'Olabisi Onabanjo University, Ago Iwoye',
    'Moshood Abiola University of Science and Technology, Abeokuta',
    // Private
    'Babcock University, Ilishan-Remo',
    'Covenant University, Ota',
    'Crescent University, Abeokuta',
    'Bells University of Technology, Ota',
    'Chrisland University, Abeokuta',
    'Crawford University, Igbesa',
    'McPherson University, Seriki-Sotayo',
    'Hallmark University, Ijebi Itele',
    'New City University, Ayetoro',
    'Monarch University, Iyesi-Ota',
    'American Open University, Abeokuta',
    'Mountain Top University, Makogi-Oba',
    'Southwestern University, Oku-Owa',
    'Trinity University, City of David',
    'Christopher University, Mowe',
    'Aletheia University, Ago-Iwoye',
    'Gerar University of Medical Sciences, Imope-Ijebu',
    'Vision University, Ikogbo',
  ],
  'Ondo': [
    // Federal
    'Federal University of Technology, Akure',
    'Adeyemi Federal University of Education, Ondo',
    // State
    'University of Medical Sciences, Ondo',
    'Ondo State University of Science and Technology, Okitipupa',
    'Adekunle Ajasin University, Akungba',
    // Private
    'Achievers University, Owo',
    'Elizade University, Ilara-Mokin',
    'Wesley University of Science and Technology, Ondo',
    'University of Fortune, Igbotako',
    'Sam Maris University, Supare',
  ],
  'Osun': [
    // Federal
    'Obafemi Awolowo University, Ile-Ife',
    'Federal University of Health Sciences, Ila Orangun',
    'Federal University of Agriculture and Developmental Studies, Iragbuji',
    // State
    'Osun State University, Osogbo',
    'University of Ilesa',
    // Private
    'Bowen University, Iwo',
    'Redeemer\'s University, Ede',
    'Fountain University, Osogbo',
    'Joseph Ayo Babalola University, Ikeji-Arakeji',
    'Adeleke University, Ede',
    'Oduduwa University, Ipetumodu',
    'Minaret University, Ikirun',
    'Kings University, Odeomu',
    'Westland University, Iwo',
    'Mercy Medical University, Iwara',
  ],
  'Oyo': [
    // Federal
    'University of Ibadan',
    'Federal University of Agriculture and Technology, Okeho',
    // State
    'Ladoke Akintola University of Technology, Ogbomoso',
    'First Technical University, Ibadan',
    'Emmanuel Alayande University of Education, Oyo',
    // Private
    'Ajayi Crowther University, Oyo',
    'Lead City University, Ibadan',
    'Dominican University, Ibadan',
    'Precious Cornerstone University, Ibadan',
    'Atiba University, Oyo',
    'West Midland Open University, Ibadan',
  ],
  'Plateau': [
    // Federal
    'University of Jos',
    'Federal University of Education, Pankshin',
    // State
    'Plateau State University, Bokkos',
    // Private
    'ANAN University, Kwall',
    'Karl-Kumm University, Vom',
  ],
  'Rivers': [
    // Federal
    'University of Port-Harcourt',
    'Federal University of Environment and Technology, Tai Town',
    // State
    'Rivers State University, Port Harcourt',
    'Ignatius Ajuru University of Education, Rumuolumeni',
    // Private
    'Pamo University of Medical Sciences, Port Harcourt',
    'Wigwe University, Isiokpo',
  ],
  'Sokoto': [
    // Federal
    'Usmanu Danfodiyo University, Sokoto',
    // State
    'Sokoto State University',
    'Shehu Shagari University of Education, Sokoto',
    // Private
    'Northwest University, Sokoto',
    'Saisa University of Medical Sciences and Technology, Sokoto',
    'Iconic Open University, Sokoto',
  ],
  'Taraba': [
    // Federal
    'Federal University, Wukari',
    // State
    'Taraba State University, Jalingo',
    // Private
    'Kwararafa University, Wukari',
    'Greenland University, Jalingo',
  ],
  'Yobe': [
    // Federal
    'Federal University, Gashua',
    // State
    'Yobe State University, Damaturu',
    // Private
  ],
  'Zamfara': [
    // Federal
    'Federal University, Gusau',
    'Federal University of Health Science and Technology, Tsafe',
    // State
    'Zamfara State University, Talata Mafara',
    // Private
    'Huda University, Gusau',
  ],
}

function getAllNigerianUniversities() {
  const all = []
  for (const [state, list] of Object.entries(universitiesByState)) {
    for (const name of list) {
      if (name.startsWith('//')) continue
      all.push({ name, country: 'Nigeria', level: 'University', state })
    }
  }
  return all
}

module.exports = { universitiesByState, getAllNigerianUniversities }

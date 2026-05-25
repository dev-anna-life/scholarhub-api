const axios = require("axios");

const africanCountries = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'Morocco',
  'Tunisia', 'Zimbabwe', 'Mozambique', 'Angola', 'Sudan', 'Somalia', 'Mali', 'Burkina Faso', 'Niger',
  'Chad', 'Guinea', 'Benin', 'Togo', 'Sierra Leone', 'Liberia', 'Malawi'
];

const fallbackSchools = [
  'University of Lagos', 'Obafemi Awolowo University', 'Ahmadu Bello University',
  'University of Nigeria Nsukka', 'Covenant University', 'University of Ibadan',
  'Lagos State University', 'University of Benin', 'Nnamdi Azikiwe University',
  'University of Port Harcourt', 'University of Ilorin', 'Babcock University',
  'University of Ghana', 'Kwame Nkrumah University of Science and Technology',
  'University of Cape Coast', 'University of Nairobi', 'Kenyatta University',
  'Makerere University', 'University of Cape Town', 'University of Pretoria',
  'University of the Witwatersrand', 'Stellenbosch University', 'Cairo University',
  'Addis Ababa University', 'University of Dar es Salaam', 'University of Rwanda',
];

const searchSchools = async (req, res) => {
  try {
    const { query } = req.query;
    const results = new Set();

    if (!query || query.length < 2) {
      try {
        const countryPromises = ['Nigeria', 'Ghana', 'Kenya'].map(
          country => axios.get(`https://universities.hipolabs.com/search?country=${encodeURIComponent(country)}`, { timeout: 5000 })
            .then(r => r.data)
            .catch(() => [])
        );
        const countryResults = await Promise.all(countryPromises);
        countryResults.flat().forEach(u => results.add(u.name));
      } catch (err) {
        console.log('External API call failed, using fallback');
      }

      fallbackSchools.forEach(s => results.add(s));
      return res.json({ schools: [...results].slice(0, 30) });
    }

    try {
      const nameRes = await axios.get(
        `https://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`,
        { timeout: 5000 }
      );

      if (nameRes.data) {
        nameRes.data
          .filter(u => africanCountries.includes(u.country))
          .forEach(u => results.add(u.name));
      }
    } catch (err) {
      console.log('External API call failed, using fallback');
    }

    fallbackSchools
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .forEach(s => results.add(s));

    const schools = [...results].slice(0, 10);

    res.json({ schools });
  } catch (error) {
    console.error('School search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { searchSchools };

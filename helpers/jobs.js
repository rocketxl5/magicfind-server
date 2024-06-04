// Source @ https://www.freecodecamp.org/news/javascript-promise-tutorial-how-to-resolve-or-reject-promises-in-js/
// Called by cron every 5 minutes to update card name list
const fs = require('fs');
const axios = require('axios');
const scryfall = require('../data/ALCHEMY');
const { handleFiles } = require('./handleFiles');

const fetchData = async (url, isFetch, results) => {
    do {
        const response = await axios.get(url);
        const { has_more, next_page, data } = response.data;
        isFetch = has_more;
        url = next_page;
        results.push(...data);
    } while (isFetch)

    return await results;
}

const jobs = [
    // Method updating card names file every 24hrs at midnight
    async () => {
        try {
            // Returns array of cardnames excluding cards begining with A- (Arena cards)
            const filterData = async (sets) => {
                return await sets.filter(set => {
                    return !set.digital &&
                        !set.set_type.includes('promo') &&
                        !set.set_type.includes('token') &&
                        !set.set_type.includes('minigame') &&
                        !set.set_type.includes('memorabilia') &&
                        !set.set_type.includes('draft_innovation')
                })
            }

            const sets = Promise.resolve();
            sets
                .then(() => fetchData('https://api.scryfall.com/sets', false, []))
                .then(res => filterData(res))
                // Write changes to file
                .then(res => handleFiles(fs, './data', 'cardsets.json', JSON.stringify(res, null, 2), true))
                .catch(error => { throw error })
        } catch (error) {
            throw new Error(error)
        }

    },
    async () => {
        let alchemy_cardnames = []
        try {
            const urls = scryfall.alchemy_sets.map(set => {
                return `https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3${set}&unique=prints`
            })

            const promises = urls.map(async (url) => {
                const cards = []
                let isFetch = true;
                const data = await fetchData(url, isFetch, []);
                return cards.push(...cards, ...data)
            })
            // Querying all urls returned in urls
            Promise.all(promises)
                .then(cards => alchemy_cardnames = cards.map(card => card.name))
                .catch(error => { throw error })

        } catch (error) {
            throw new Error(error);
        }

        try {
            const response = await axios.get('https://api.scryfall.com/catalog/card-names');
            const cardnames = response.data.data;

            // Returns array of cardnames excluding cards begining with A- (Arena cards)
            const filteredCardnames = cardnames.filter(cardname => {
                return /^(?!A-).*$/.test(cardname) && !alchemy_cardnames.includes(cardname)
            });

            const searchRedundencies = async (filteredCardnames) => {
                try {
                    const result = await filteredCardnames.map((name, index) => { return { name: name, index: index } })
                        .filter(obj => { return obj.name.includes('//') })
                        .map(obj => { return { name: obj.name.split('//').map(el => el.trim()), index: obj.index } })
                        .filter(obj => { return obj.name[0].includes(obj.name[1]) });
                    return await result;
                } catch (error) {
                    throw new Error(error);
                }
            }
            const removeRedundencies = async (redundencies, filteredCardnames) => {
                await redundencies.forEach((redundency, i) => {
                    const index = redundency.index - i;
                    filteredCardnames.splice(index, 1);
                });
            }

            searchRedundencies(filteredCardnames).then((found) => {
                removeRedundencies(found, filteredCardnames).then(() => {
                    // Write changes to file
                    handleFiles(fs, './data', 'cardnames.json', JSON.stringify(filteredCardnames), true);
                })
            });
        } catch (error) {
            throw new Error(error);
        }
    }
]

module.exports = { jobs };

// Called by cron every 5 minutes to update card name list
const fs = require('fs');
const axios = require('axios');
const scryfall = require('../data/ALCHEMY');
const { handleFiles } = require('./handleFiles');

const jobs = {
    // Method updating card names file every 24hrs at midnight
    updateCardList: () => {
        let alchemy_cardnames = [];

        try {
            const urls = scryfall.alchemy_sets.map(set => {
                return `https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&order=set&q=e%3${set}&unique=prints`
            })

            const fetchCards = async (url, isFetch, results) => {
                do {
                    const response = await axios.get(url);
                    const { has_more, next_page, data } = response.data;
                    isFetch = has_more;
                    url = next_page;
                    results.push(...data);
                } while (isFetch)

                return results;
            }

            Promise.all(urls.map(async (url) => {
                let isFetch = true;
                return await fetchCards(url, isFetch, []);
            })).then(res => {
                alchemy_cardnames = res.map(result => {
                    return [...result]
                }).flat()
            })

        } catch (error) {
            throw new Error(error);
        }

        try {
            const promise = axios.get('https://api.scryfall.com/catalog/card-names');

            const getCardNames = () => {
                promise.then(res => {
                    const names = res.data.data;
                    // Card name sanitizing: 
                    // -Removes Alchemy format [digital format] card names 
                    // -Checks and removes repetition of card name in two sided cards
                    // -Write result to cardnames file for archive search @ front end
                    names.filter(name => {
                        return /^(?!A-).*$/.test(name) && !alchemy_cardnames.includes(name)
                    })
                        .map((name, index) => { return { name: name, index: index } })
                        .filter(obj => { return obj.name.includes('//') })
                        .map(obj => { return { name: obj.name.split('//').map(el => el.trim()), index: obj.index } })
                        .filter(obj => { return obj.name[0].includes(obj.name[1]) })
                        .forEach((name, i) => {
                            const index = name.index - i;
                            names.splice(index, 1);
                            handleFiles(fs, '../data', 'cardnames.json', JSON.stringify(names));
                        });
                },
                    error => console.log(error)
                )
            }

            getCardNames();
        } catch (error) {
            throw new Error(error);
        }
    }
}

module.exports = { jobs };
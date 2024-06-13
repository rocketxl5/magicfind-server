// Source @ https://www.freecodecamp.org/news/javascript-promise-tutorial-how-to-resolve-or-reject-promises-in-js/
// Called by cron every 5 minutes to update card name list
const fs = require('fs');
const axios = require('axios');
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
    // Fetch and filters MTG card sets
    async () => {
        try {
            await axios.get('https://api.scryfall.com/sets')
                .then(res => {
                    const sets = res.data.data;
                    // console.log(sets)
                    return sets.filter(set => {
                        return !set.digital
                    })

                        .map(set => {
                            // Trim unnecessary props
                            const {
                                id,
                                object,
                                code,
                                mtgo_code,
                                arena_code,
                                tcgplayer_id,
                                uri,
                                scryfall_uri,
                                set_type,
                                digital,
                                nonfoil_only,
                                parent_set_code,
                                foil_only,
                                block_code,
                                block,
                                printed_size,
                                ...rest
                            } = set;
                            return { [set.id]: rest };
                        })
                }
                )
                // Write changes to file
                .then(res => handleFiles(fs, './data', 'cardsets.json', JSON.stringify(res), true, 'Cardsets successfully updated'))
                .then((res) => { return 'Cardsets successfully updated' })
                .catch(error => { throw error })
        } catch (error) {
            throw new Error(error)
        }
    },
    // Fetch and sanitize MTG card names for Archive autocomplete
    async () => {
        try {
            await axios.get('https://data.scryfall.io/default-cards/default-cards-20240611210858.json')
                .then(res => {
                    const cards = res.data;
                    return cards.filter(card => card.set_type.toLowerCase() !== 'alchemy' &&
                        !card.set_name.toLowerCase().includes('alchemy') &&
                        // Exclude card name beginnig with A- (alchemy specific cards)
                        /^(?!A-).*$/.test(card.name) &&
                        // Exclude Gleemox (mtgo online exclusive)
                    // card.name.toLowerCase() !== 'gleemox' &&
                        // Exclude card with '[year] World Champion' and '[year] World Championships Ad' titles
                        !card.name.toLowerCase().includes('world champion')
                    )
                        .map(card => card.name);
                })
                .then(res => {
                    res.map((name, i) => { return { name: name, index: i } })
                        .filter(obj => { return obj.name.includes('//') })
                        .map(obj => {
                            return {
                                name: obj.name.split('//')
                                    .map(el => el.trim()), index: obj.index
                            }
                    })
                        .filter(obj => { return obj.name[0].includes(obj.name[1]) })
                        .forEach((obj, i) => {
                            const index = obj.index - i;
                            results.splice(index, 1);
                        })
                        .sort().filter((name, i) => name !== res[i - 1])
                })
                .then((res) => {
                    console.log(res)
                    handleFiles(fs, './data', 'cardnames.json', JSON.stringify(res), true, 'Cardnames successfully updated');
                })
                // .then(() => { return 'Cardnames successfully updated' })
                .catch(error => { throw error });
        } catch (error) {
            throw error
        }
    }
]

module.exports = jobs;
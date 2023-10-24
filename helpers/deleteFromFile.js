const deleteFromFile = (fs, path, data, encode) => {
    const { cardID, userID } = data;

    try {
        const result = fs.readFileSync(path, encode);
        let catalogJSON = JSON.parse(result);
        catalogJSON.forEach((card, index) => {
            if (card._id === cardID && card.userID === userID) {
                catalogJSON.splice(index, 1);
            }
        });
        catalogJSON = JSON.stringify(catalogJSON);
        fs.writeFileSync(path, catalogJSON, encode);
    } catch (error) {
        throw new Error(error)
    }
}

module.exports = { deleteFromFile }
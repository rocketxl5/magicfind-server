const appendToFile = (fs, path, data, encode) => {
    try {
        const catalog = fs.readFileSync(path, encode);
        let catalogJSON = JSON.parse(result);
        catalogJSON.push(data);
        catalogJSON = JSON.stringify(catalogJSON);
        fs.writeFileSync(path, catalogJSON, encode);
    } catch (error) {
        throw new Error(error)
    }
}

module.exports = { appendToFile }
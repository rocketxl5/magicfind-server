const appendToFile = async (fs, path, data, encode) => {
    try {
        let catalog = await fs.readFileSync(path, encode);
        // let catalogJSON = JSON.parse(catalog);
        console.log(catalog)
        // catalogJSON.push(data);
        // catalogJSON = JSON.stringify(catalogJSON);
        // await fs.writeFileSync(path, catalogJSON, encode);
        return true
    } catch (error) {
        throw new Error(error)
    }
}

module.exports = { appendToFile }
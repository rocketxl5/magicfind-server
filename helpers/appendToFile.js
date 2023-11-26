const appendToFile = async (fs, path, data, encode) => {
    try {
        const catalog = await fs.readFileSync(path, encode);
        let catalogJSON = JSON.parse(result);
        catalogJSON.push(data);
        catalogJSON = JSON.stringify(catalogJSON);
        await fs.writeFileSync(path, catalogJSON, encode);
        return true
    } catch (error) {
        throw new Error(error)
    }
}

module.exports = { appendToFile }
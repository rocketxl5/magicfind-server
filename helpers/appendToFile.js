const appendToFile = (fs, path, data, encode) => {
    try {
        const result = fs.readFileSync(path, encode);
        let resultJSON = JSON.parse(result);
        resultJSON.push(data);
        resultJSON = JSON.stringify(resultJSON);
        fs.writeFileSync(path, resultJSON, encode);
    } catch (error) {
        throw new Error(error)
    }
}

module.exports = { appendToFile }
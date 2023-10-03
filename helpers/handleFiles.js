const handleFiles = (fs, directory, filename, data) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(`${directory}`);
    }
    writeToFile(fs, directory, filename, data);
}


const writeToFile = (fs, directory, filename, data) => {
    fs.writeFile(`${directory}/${filename}`, `${data}`, (error) => {
        if (error) {
            throw new Error(error)
        }
    })
}

module.exports = { handleFiles }

const handleFiles = (fs, directory, filename, data, async = false, message) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(`${directory}`);
    }
    if (!async) {
        writeToFile(fs, directory, filename, data, message);
    }
    else {
        writeToFileAsync(fs, directory, filename, data, message);
    }
}

const writeToFile = (fs, directory, filename, data, message) => {
    fs.writeFileSync(`${directory}/${filename}`, data, (error) => {
        if (error) throw Error

        console.log(message)
    })
}

const writeToFileAsync = (fs, directory, filename, data, message) => {
    fs.writeFile(`${directory}/${filename}`, data, (error) => {
        if (error) throw Error

        console.log(message)

    })
}

module.exports = { handleFiles }

export function convertToTitleCase(str: string | number): string {
    const prepositions = ['and', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'with', 'in', 'out']
    return str
        .toString()
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, function (txt, index, fullStr) {
            const word = txt.toLowerCase()
            const isFirstOrLastWord = index === 0 || index + txt.length === fullStr.length
            if (isFirstOrLastWord || !prepositions.includes(word)) {
                return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
            } else {
                return word
            }
        })
}

export function pickRandomGradient(gradientCache: { [key: string]: string } = {}): string {
    const index = Object.keys(gradientCache).length
    if (gradientCache[index]) {
        return gradientCache[index]
    }
    const gradientIndex = Math.floor(Math.random() * 10)
    return `var(--bubble-gradient-${gradientIndex})`
}

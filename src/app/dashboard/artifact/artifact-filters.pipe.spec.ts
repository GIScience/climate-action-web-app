import {FilterByCriteriaPipe} from './artifact-filters.pipe'

describe('ArtifactFiltersPipe', () => {
    it('create an instance', () => {
        const pipe = new FilterByCriteriaPipe()
        expect(pipe).toBeTruthy()
    })
})

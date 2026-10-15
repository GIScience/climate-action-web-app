import { Models } from 'appwrite'

export function isRealUser(user: Models.User<Models.Preferences> | null): user is Models.User<Models.Preferences> {
    return !!(user && user.$id !== 'fake-user-id')
}

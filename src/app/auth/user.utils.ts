import { Models } from 'appwrite'

export function isRealUser(user: Models.User<Models.Preferences> | null): boolean {
    return !!(user && user.$id !== 'fake-user-id')
}

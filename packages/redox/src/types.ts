/** ************************** instance-end *************************** */

type Without<FirstType, SecondType> = {
  [KeyType in Exclude<keyof FirstType, keyof SecondType>]: never
}
export type MergeExclusive<FirstType, SecondType> =
  | FirstType
  | SecondType extends object
  ?
      | (Without<FirstType, SecondType> & SecondType)
      | (Without<SecondType, FirstType> & FirstType)
  : FirstType | SecondType

export type DeepReadonly<T> = {
  readonly [P in keyof T]: keyof T[P] extends never ? T[P] : DeepReadonly<T[P]>
}

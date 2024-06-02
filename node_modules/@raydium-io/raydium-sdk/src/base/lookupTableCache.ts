import { AddressLookupTableAccount, PublicKey } from '@solana/web3.js'

import { CacheLTA } from '../common'

export const LOOKUP_TABLE_CACHE: CacheLTA = {
  '2immgwYNHBbyVQKVGCEkgWpi53bLwWNRMB5G2nbgYV17': new AddressLookupTableAccount({
    key: new PublicKey('2immgwYNHBbyVQKVGCEkgWpi53bLwWNRMB5G2nbgYV17'),
    state: AddressLookupTableAccount.deserialize(
      Buffer.from(
        'AQAAAP//////////d49+DAAAAAAAAQZMWvw7GUNJdaccNBVnb57OKakxL2BHLYvhRwVILRsgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMGRm/lIRcy/+ytunLDm+e8jOW7xfcSayxDmzpAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKkG3fbh7nWP3hhCXbzkbM3athr8TYO5DSf+vfko2KGL/AVKU1D4XciC1hSlVnJ4iilt3x6rq9CmBniISTL07vagBqfVFxksXFEhjMlMPUrxf1ja7gibof1E49vZigAAAAAGp9UXGMd0yShWY5hpHV62i164o5tLbVxzVVshAAAAAIyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZC3BlsePRfEU4nVJ/awTDzVi4bHMaoP21SbbRvAP4KUbIScv+6Yw2LHF/6K0ZjUPibbSWXCirYPGuuVl7zT789IUPLW4CpHr4JNCatp3ELXDLKMv6JJ+37le50lbBJ2LvDQdRqCgtphMF/imcN7mY5YRx2xE1A3MQ+L4QRaYK9u4GRfZP3LsAd00a+IkCpA22UNQMKdq5BFbJuwuOLqc8zxCTDlqxBG8J0HcxtfogQHDK06ukzfaXiNDKAob1MqBHS9lJxDYCwz8gd5DtFqNSTKG5l1zxIaKpDP/sffi2is1H9aKveyXSu5StXElYRl9SD5As0DHE4N0GLnf84/siiKXVyp4Ez121kLcUui/jLLFZEz/BwZK3Ilf9B9OcsEAeDMKAy2vjGSxQODgBz0QwGA+eP4ZjIjrIAQaXENv31QfLlOdXSRCkaybRniDHF4C8YcwhcvsqrOVuTP4B2Na+9wLdtrB31uz2rtlFI5kahdsnp/d1SrASDInYCtTYtdoke4kX+hoKWcEWM4Tle8pTUkUVv4BxS6fje/EzKBE4Qu9N9LMnrw/JNO0hqMVB4rk/2ou4AB1loQ7FZoPwut2o4KZB+0p9xnbrQKw038qjpHar+PyDwvxBRcu5hpHw3dguezeWv+IwvgW5icu8EGkhGa9AkFPPJT7VMSFb8xowveU=',
        'base64',
      ),
    ),
  }),
}

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './button'
import { PlaidLinkOptions, usePlaidLink, PlaidLinkOnSuccess } from 'react-plaid-link'
import { useRouter } from 'next/navigation'
import { createLinkToken, exchangePublicToken } from '@/lib/actions/user.actions'

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();
  const [token, setToken] = useState('')

  useEffect(() => {
    const getTokenLink = async () => {
      if (!user) return;
      
      try {
        const data = await createLinkToken(user);
        
        // This will show you exactly what is missing in the terminal/console
        console.log("Plaid Response Data:", data);
        
        const linkToken = data?.link_token || data?.linkToken;
        
        if (linkToken) {
          setToken(linkToken);
        }
      } catch (error) {
        console.error("Error fetching link token:", error);
      }
    }
    getTokenLink();
  }, [user])

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    await exchangePublicToken({
      publicToken: public_token,
      user,
    });
    router.push('/');
  }, [user, router])

  const config: PlaidLinkOptions = {
    token,
    onSuccess,
  }

  const { open, ready } = usePlaidLink(config);

  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => open()}
          disabled={!ready}
          className='plaidlink-primary'
        >
          Connect bank
        </Button>
      ) : variant === 'ghost' ? (
        <Button
          onClick={() => open()}
          disabled={!ready}
          variant="ghost"
          className="plaidlink-ghost"
        >
          Connect bank
        </Button>
      ) : (
        <Button
          onClick={() => open()}
          disabled={!ready}
          className="plaidlink-default"
        >
          Connect bank
        </Button>
      )}
    </>
  )
}

export default PlaidLink
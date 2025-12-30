import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './button'
import { PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation'
import { PlaidLinkOnSuccess } from 'react-plaid-link'
import { createLinkToken } from '@/lib/actions/user.actions'

const PlaidLink = ({user,variant}:PlaidLinkProps) => {
    const router = useRouter();
    const [token,setToken]=useState('')
    useEffect(()=>{
        const getTokenLink= async()=>{
            const data = await createLinkToken(user);

            setToken(data?.link_token)
        }

    },[user])
    const Onsucess = useCallback<PlaidLinkOnSuccess>
    (async(public_token:String)=>{
        // await exchangePublicToken({
        //     publicToken=public_token,
        //     user,
        // })
        router.push('/');
    },[user])
  const config : PlaidLinkOptions = {
    token,
    onSuccess: Onsucess,
  }

  const{open, ready} = usePlaidLink(config);
    return (
    <>
     {variant==='primary' ? (
        <Button
        onClick={()=>open}
        disabled={!ready}
        className='plaidlink-primary'>
            Connect bank
        </Button>
        ) : variant==='ghost' ?(
        <Button>
            Connect bank
        </Button>
        ):(
        <Button>
                Connect bank
        </Button>
        )}
    </>
  )
}

export default PlaidLink

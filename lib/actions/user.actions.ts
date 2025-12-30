"use server";

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { parse } from "path";
import { createDwollaCustomer } from "./dwolla.actions";
import { da } from "zod/v4/locales";

const {
  APPWRITE_DATABASE_ID:DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID:USER_COLLECTION_ID, 
  APPWRITE_BANK_COLLECTION_ID:BANK_COLLECTION_ID,
}= process.env

export const signIn = async ({email,password}:signInProps) => {
  try {
    const { account } = await createAdminClient();

    const response= await account.createEmailPasswordSession(email,password)
    return parseStringify(response);
  } catch (error) {
    console.log("ERROR", error);
  }
};

export const signUp = async (userData: SignUpParams) => {
  const { email, password, firstName, lastName } = userData;

  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

     newUserAccount = await account.create(
        ID.unique(),
        email,
        password,
        `${firstName} ${lastName}`
    );
  
    if(!newUserAccount) throw new Error('Error creating User account');

    const dwollaCustomerUrl= await createDwollaCustomer({
      ...userData,
      type:'personal'
    });

    if(!dwollaCustomerUrl) throw new Error('Error creating Dwolla Customer');

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser= await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId:newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl
      }
    )

    const session = await account.createEmailPasswordSession(email,password);

    const cookieStore = await cookies();
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    return parseStringify(newUser);
  } catch (error) {
    console.log("ERROR", error);
  }
};


export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const user =  await account.get();
    return parseStringify(user)
  } catch (error) {
    return null;
  }
}

export const logoutAccount=async()=>{
  try {
    const {account}=await createSessionClient();

    cookieStore.delete('appwrite-session');
    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}

export const createLinkToken=async(user:User)=>{
  try {
    const tokenParams={
      user:{
        client_user_id:user.$id,
      },
      client_name: user.name as string,
      products:["auth"] as Products[],
      language:'en',
      country_codes:['US'] as CountryCode[],
      }
      const response = await plaidClient.linkTokenCreate(tokenParams);
      return parseStringify({linkToken:response.data.link_token})
  } catch (error) {
    console.log(error);
  }
}

export const createBankAccount=async({
  userId,
  bankId,
  accessToken,
  accountId,
  fundingSourceUrl,
  sharableId
}:createBankAccountProps) =>{
  try {
    const{database}= await createAdminClient();
    const bankAccount= await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accessToken,
        accountId,
        fundingSourceUrl,
        sharableId
      }
    )
    return parseStringify(bankAccount);
  } catch (error) {
    console.log
  }
}

export const exchangePublicToken=async({
  publicToken,
  user
}:exchangePublicTokenProps)=>{
  try {
    // exchange public token for access token and item id
    const response= await plaidClient.itemPublicTokenExchange({
      public_token:publicToken,
    });
    const accessToken=response.data.access_token;
    const itemId=response.data.item_id;
    //get account information from plaid using the access token
    const accountsResponse= await plaidClient.accountsGet({
      access_token:accessToken,
    });
    const accountData=accountsResponse.data.accounts[0];
    // create processor token for dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest={
      access_token:accessToken,
      account_id:accountData.account_id,
      processor:'dwolla' as ProcessorTokenCreateRequestProcessorEnum,
    };
    const processorResponse= await plaidClient.processorTokenCreate(request);
    const processorToken=processorResponse.data.processor_token;

    // create a funding source URL in Dwolla for the account using the Dwolla customer ID,processor token, and account name
    const fundingSourceUrl= await addFundingSource({
      dwollaCustomerId:user.dwollaCustomerId,
      processorToken,
      bankName:accountData.name as string,
    })
    // if the funding source URL is not created, throw an error
    if(!fundingSourceUrl) throw Error;
    // create a bank account using the userId, bankId,itemId,accessToken,accountId,fundingSourceUrl and a sharable ID
    await createBankAccount({
      userId:user.$id,
      bankId:itemId,
      accountId:accountData.account_id,
      accessToken,
      fundingSourceUrl,
      sharableId:encryptId(accountData.account_id)
    });

    
// revalidate the path to reflect the changes
revalidatePath('/');

// return sucess message
 return parseStringify({
  publicTokenExchange:"completed"
});
  }catch (error) {
    console.log("an error occurred while creating exchanging token",error);
  }
}

async function addFundingSource({ dwollaCustomerId, processorToken, bankName }: { dwollaCustomerId: string; processorToken: string; bankName: string }): Promise<string | null> {
    try {
      // TODO: Implement Dwolla funding source creation
      return null;
    } catch (error) {
      console.log("Error adding funding source:", error);
      return null;
    }
  }
// function createBankAccount(arg0: { userId: string; bankId: string; accountId: string; accessToken: string; fundingSourceUrl: string; sharableId: string; }) {
//   throw new Error("Function not implemented.");
// }


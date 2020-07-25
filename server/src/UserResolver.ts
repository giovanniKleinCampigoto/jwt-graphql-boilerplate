import {Resolver, Query, Mutation, Arg, ObjectType, Field, Ctx, UseMiddleware} from 'type-graphql'

import {hash, compare} from 'bcryptjs'

import {User} from './entity/User'
import {MyContext} from './MyContext'
import {isAuth} from './isAuth'

import {createRefreshToken, createAccessToken} from './auth'

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string
}

@Resolver()
export class UserResolver {
  
  @Query(() => String)
  hello() {
    return 'hi!'
  }

  @Query(() => String)
  @UseMiddleware(isAuth)
  bye(
    @Ctx() {payload}: MyContext
  ) {
    console.log(payload?.userId)
    return `your user id is ${payload!.userId}`
  }
  
  @Query(() => [User])
  users() {
    return User.find();
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() { res}: MyContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({ where: {email}})

    if(!user) {
      throw new Error('could not find user');      
    }

    const valid = await compare(password, user.password)

    if(!valid) {
      throw new Error("bad password")
    }

    res.cookie('jid', createRefreshToken(user), {httpOnly: true})

    return {
      accessToken: createAccessToken(user)
    }
  }

  @Mutation(() => Boolean)
  async register(
    @Arg('email') email: string,
    @Arg('password') password: string,
  ) {
    const hashedPassword = await hash(password, 12)

    try {
      await User.insert({
        email, password: hashedPassword
      });      
    } catch (error) {
      console.error(error)      
      return false;
    }
    return true
  }
}
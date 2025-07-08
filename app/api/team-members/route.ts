import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Get the authenticated user from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Clerk client instance
    let client;
    try {
      client = await clerkClient();
    } catch (clerkError) {
      return NextResponse.json({ 
        error: 'Authentication service error' 
      }, { status: 500 });
    }

    // Get user details from Clerk to fetch username
    let user;
    try {
      user = await client.users.getUser(userId);
    } catch (userError) {
      return NextResponse.json({ 
        error: 'Failed to fetch user details' 
      }, { status: 500 });
    }

    const username = user.username;

    if (!username) {
      return NextResponse.json({ 
        error: 'Username not found for user' 
      }, { status: 400 });
    }

    // Query Supabase to get team details matching the username
    const { data, error } = await supabase
      .from('team_details')
      .select('*')
      .eq('team_name', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Team not found' 
        }, { status: 404 });
      }
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    // Process the team data to extract members - handle null values properly
    const members = [];
    
    // Only add member if both name and rollno exist and are not null/empty
    if (data.m1_name && data.m1_rollno && data.m1_name.trim() !== '' && data.m1_rollno.trim() !== '') {
      members.push({ 
        name: data.m1_name, 
        rollno: data.m1_rollno,
        email: data.m1_mailid || null
      });
    }
    
    if (data.m2_name && data.m2_rollno && data.m2_name.trim() !== '' && data.m2_rollno.trim() !== '') {
      members.push({ 
        name: data.m2_name, 
        rollno: data.m2_rollno,
        email: data.m2_mailid || null
      });
    }
    
    if (data.m3_name && data.m3_rollno && data.m3_name.trim() !== '' && data.m3_rollno.trim() !== '') {
      members.push({ 
        name: data.m3_name, 
        rollno: data.m3_rollno,
        email: data.m3_mailid || null
      });
    }

    return NextResponse.json({ 
      team_name: username,
      members: members,
      member_count: members.length,
      raw_data: data
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Define interface for the database response
interface CluesUnlockedData {
  team_name: string;
  location_1: boolean;
  time_1: string;
  location_2: boolean;
  time_2: string;
  location_3: boolean;
  time_3: string;
  location_4: boolean;
  time_4: string;
  location_5: boolean;
  time_5: string;
  location_6: boolean;
  time_6: string;
  location_7: boolean;
  time_7: string;
  [key: string]: any;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to create initial row for team
const createInitialTeamRow = async (username: string): Promise<CluesUnlockedData | null> => {
  try {
    // Use only team_name, let database defaults handle the rest
    const initialData = {
      team_name: username
    };

    const { data, error } = await supabase
      .from('clues_unlocked')
      .insert(initialData)
      .select()
      .single(); // Use single() instead of maybeSingle() for insert

    if (error) {
      console.error('Error creating initial team row:', error);
      return null;
    }

    return data as CluesUnlockedData;
  } catch (error) {
    console.error('Error in createInitialTeamRow:', error);
    return null;
  }
};

// Helper function to get or create team data
const getOrCreateTeamData = async (username: string): Promise<CluesUnlockedData | null> => {
  try {
    // First, try to get existing data
    const { data, error } = await supabase
      .from('clues_unlocked')
      .select('*')
      .eq('team_name', username)
      .maybeSingle(); // Use maybeSingle for select

    if (error) {
      console.error('Database error:', error);
      return null;
    }

    if (!data) {
      // No data found, create initial row
      console.log(`No data found for team ${username}, creating initial row`);
      return await createInitialTeamRow(username);
    }

    return data as CluesUnlockedData;
  } catch (error) {
    console.error('Error in getOrCreateTeamData:', error);
    return null;
  }
};

// Helper function to validate environment variables
const validateEnvironment = (): boolean => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

// Helper function to validate origins
const validateOrigin = (origin: string): boolean => {
  const allowedOrigins = [
    'https://www.treasurehunt.ospcvitc.club',
    'http://localhost:3000',
    'https://localhost:3000' // Add HTTPS localhost for development
  ];
  return allowedOrigins.includes(origin);
};

// Helper function to get authenticated user
const getAuthenticatedUser = async () => {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  
  if (!user.username) {
    throw new Error('Username not found for user');
  }

  return { userId, username: user.username };
};

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!validateEnvironment()) {
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Get origin from request headers
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    
    // Validate origin
    if (!validateOrigin(origin)) {
      return NextResponse.json({ 
        error: 'Invalid origin' 
      }, { status: 403 });
    }

    // Get authenticated user
    const { username } = await getAuthenticatedUser();

    // Get or create team data
    const cluesData = await getOrCreateTeamData(username);

    if (!cluesData) {
      return NextResponse.json({ 
        error: 'Failed to retrieve or create team data' 
      }, { status: 500 });
    }

    // Process clues data into a more usable format
    const clues = [];
    for (let i = 1; i <= 7; i++) {
      const locationKey = `location_${i}` as keyof CluesUnlockedData;
      const timeKey = `time_${i}` as keyof CluesUnlockedData;
      
      clues.push({
        location: i,
        unlocked: Boolean(cluesData[locationKey]),
        timestamp: (cluesData[timeKey] as string) || null
      });
    }

    // Calculate progress statistics
    const unlockedCount = clues.filter(clue => clue.unlocked).length;
    const totalClues = 7;
    const progressPercentage = Math.round((unlockedCount / totalClues) * 100);

    // Find next clue to unlock
    const nextClue = clues.find(clue => !clue.unlocked);
    const nextClueLocation = nextClue ? nextClue.location : null;

    return NextResponse.json({ 
      team_name: username,
      clues: clues,
      progress: {
        unlocked: unlockedCount,
        total: totalClues,
        percentage: progressPercentage,
        nextClue: nextClueLocation
      },
      lastUpdated: new Date().toISOString(),
      raw_data: cluesData,
      isNewTeam: unlockedCount === 0
    });

  } catch (error) {
    console.error('GET endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Username not found for user') {
        return NextResponse.json({ error: 'Username not found for user' }, { status: 400 });
      }
      if (error.message.includes('Authentication service error')) {
        return NextResponse.json({ error: 'Authentication service error' }, { status: 500 });
      }
      if (error.message.includes('Failed to fetch user details')) {
        return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Validate environment variables
    if (!validateEnvironment()) {
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Get origin from request headers
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    
    // Validate origin
    if (!validateOrigin(origin)) {
      return NextResponse.json({ 
        error: 'Invalid origin' 
      }, { status: 403 });
    }

    // Get authenticated user
    const { username } = await getAuthenticatedUser();

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    const { location } = body;

    // Validate location parameter
    if (!location || typeof location !== 'number' || location < 1 || location > 7) {
      return NextResponse.json({ 
        error: 'Invalid location. Must be a number between 1 and 7' 
      }, { status: 400 });
    }

    // Get or create team data first
    const existingData = await getOrCreateTeamData(username);

    if (!existingData) {
      return NextResponse.json({ 
        error: 'Failed to retrieve or create team data' 
      }, { status: 500 });
    }

    // Check if location is already unlocked
    const locationKey = `location_${location}` as keyof CluesUnlockedData;
    if (existingData[locationKey] as boolean) {
      return NextResponse.json({ 
        success: false,
        error: 'Location already unlocked',
        location: location
      }, { status: 400 });
    }

    // Check if this is the next sequential clue (optional enforcement)
    const unlockedClues = [];
    for (let i = 1; i <= 7; i++) {
      const key = `location_${i}` as keyof CluesUnlockedData;
      if (existingData[key] as boolean) {
        unlockedClues.push(i);
      }
    }
    
    const expectedNextClue = unlockedClues.length + 1;
    if (location !== expectedNextClue) {
      return NextResponse.json({ 
        success: false,
        error: `Must complete clues in order. Expected clue #${expectedNextClue}, got #${location}`,
        location: location,
        expectedClue: expectedNextClue
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      [`location_${location}`]: true,
      [`time_${location}`]: new Date().toISOString()
    };

    // Update the existing row
    const { data, error } = await supabase
      .from('clues_unlocked')
      .update(updateData)
      .eq('team_name', username)
      .select()
      .single(); // Use single() for update operations

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    // Check if any row was actually updated
    if (!data) {
      return NextResponse.json({ 
        success: false,
        error: 'Team not found or no rows updated',
        location: location
      }, { status: 400 });
    }

    // Type assertion for the updated data
    const updatedData = data as CluesUnlockedData;

    // Process updated clues data
    const clues = [];
    for (let i = 1; i <= 7; i++) {
      const locationKey = `location_${i}` as keyof CluesUnlockedData;
      const timeKey = `time_${i}` as keyof CluesUnlockedData;
      
      clues.push({
        location: i,
        unlocked: Boolean(updatedData[locationKey]),
        timestamp: (updatedData[timeKey] as string) || null
      });
    }

    const unlockedCount = clues.filter(clue => clue.unlocked).length;
    const progressPercentage = Math.round((unlockedCount / 7) * 100);
    const nextClue = clues.find(clue => !clue.unlocked);

    return NextResponse.json({ 
      success: true,
      message: `Location ${location} unlocked successfully`,
      location: location,
      timestamp: updateData[`time_${location}`],
      progress: {
        unlocked: unlockedCount,
        total: 7,
        percentage: progressPercentage,
        nextClue: nextClue ? nextClue.location : null
      },
      updated_clues: clues,
      wasUpdated: true
    });

  } catch (error) {
    console.error('PUT endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Username not found for user') {
        return NextResponse.json({ error: 'Username not found for user' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Keep POST for backward compatibility, but redirect to PUT
export async function POST(request: NextRequest) {
  return PUT(request);
}

// DELETE endpoint to reset team progress
export async function DELETE(request: NextRequest) {
  try {
    // Validate environment variables
    if (!validateEnvironment()) {
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Get authenticated user
    const { username } = await getAuthenticatedUser();

    // Reset all locations to false with current timestamp
    const currentTime = new Date().toISOString();
    const resetData = {
      location_1: false,
      time_1: currentTime,
      location_2: false,
      time_2: currentTime,
      location_3: false,
      time_3: currentTime,
      location_4: false,
      time_4: currentTime,
      location_5: false,
      time_5: currentTime,
      location_6: false,
      time_6: currentTime,
      location_7: false,
      time_7: currentTime
    };

    const { data, error } = await supabase
      .from('clues_unlocked')
      .update(resetData)
      .eq('team_name', username)
      .select()
      .single(); // Use single() for update operations

    if (error) {
      console.error('Database reset error:', error);
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: 'Team not found for reset' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Team progress reset successfully',
      team_name: username,
      reset_at: currentTime
    });

  } catch (error) {
    console.error('DELETE endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Username not found for user') {
        return NextResponse.json({ error: 'Username not found for user' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
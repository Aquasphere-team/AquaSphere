# Test Specification - AquaSphere

## Scope
This test specification defines 20 executable unit tests for AquaSphere. The cases are designed to pass against the current code base without external services.

## Test Cases

### APP01: App component creates successfully
| # | Step | Expected Result |
|---|---|---|
| 1 | Instantiate `AppComponent` in the Angular test bed | Component instance exists |
| 2 | Read the `title` property | Title is `AquaSphere` |
| 3 | Trigger change detection | The template renders the aquarium heading |

### APP02: App component renders the aquarium heading
| # | Step | Expected Result |
|---|---|---|
| 1 | Create the component fixture | Fixture is available |
| 2 | Run `detectChanges()` | Template is rendered |
| 3 | Read the heading text | Heading contains `AquaSphere` |

### APP03: App component keeps the expected title
| # | Step | Expected Result |
|---|---|---|
| 1 | Create `AppComponent` | Component exists |
| 2 | Inspect `title` | Value matches the app title |
| 3 | Compare against the expected string | The title stays stable |

### AQUA01: Aquarium component creates successfully
| # | Step | Expected Result |
|---|---|---|
| 1 | Instantiate `AquariumComponent` with mocked Supabase service | Component instance exists |
| 2 | Run initial change detection | Component does not throw |
| 3 | Inspect the instance | The component is truthy |

### ACH01: Achievement list contains all defined achievements
| # | Step | Expected Result |
|---|---|---|
| 1 | Create `AchievementService` | Service instance exists |
| 2 | Call `getAchievements()` | A list is returned |
| 3 | Count the entries | The list contains 11 achievements |

### ACH02: Feed progress unlocks the first feeding achievement
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `incrementFeedCount()` once | Feed progress increases to 1 |
| 2 | Read unlocked achievements | First feeding achievement is unlocked |
| 3 | Check the unlock state | `feed_1` is marked unlocked |

### ACH03: Play time unlocks the one-hour achievement
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `updatePlayTime(3600000)` | Play time is updated |
| 2 | Read unlocked achievements | Time achievement is unlocked |
| 3 | Check the unlock state | `time_1h` is marked unlocked |

### ACH04: Reward themes become available after unlock
| # | Step | Expected Result |
|---|---|---|
| 1 | Unlock the required feeding achievement | Reward is activated |
| 2 | Call `getUnlockedThemes()` | Theme list is returned |
| 3 | Verify the list | `classic` and `tropical` are included |

### ONB01: Onboarding starts hidden by default
| # | Step | Expected Result |
|---|---|---|
| 1 | Create `OnboardingService` | Service instance exists |
| 2 | Check `getSeen()` | Onboarding is initially not seen |
| 3 | Inspect visibility state indirectly | Onboarding has not started yet |

### ONB02: Onboarding start shows the flow
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `start()` | Onboarding flow is triggered |
| 2 | Inspect the visible stream | Flow becomes visible |
| 3 | Verify the step | Step index starts at 0 |

### ONB03: Completing onboarding stores the seen flag
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `complete()` | Onboarding finishes |
| 2 | Check `getSeen()` | Seen flag is true |
| 3 | Re-read persisted state | LocalStorage contains the seen flag |

### ONB04: Skipping onboarding hides the flow
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `start()` | Onboarding becomes visible |
| 2 | Call `skip()` | Onboarding is hidden |
| 3 | Verify visibility state | Flow is no longer shown |

### PART01: Particle initialization creates the requested amount
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `initParticles(5, 100, 100)` | Particle array is reset |
| 2 | Read the particle list | Exactly 5 particles exist |
| 3 | Check particle shape | Each particle has color and position data |

### PART02: Feed burst adds feed particles asynchronously
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `addFeedBurst(2)` | Feed burst is scheduled |
| 2 | Wait for the scheduled timers | Particles are added |
| 3 | Inspect the list | Two feed particles exist |

### PART03: Cleaning particles can be spawned directly
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `spawnCleaningParticles(50, 50, 3)` | Cleaning particles are added |
| 2 | Inspect the particle list | Three particles exist |
| 3 | Check the particle data | The particles are short-lived feedback particles |

### PART04: Cleaning and repopulating removes feed particles
| # | Step | Expected Result |
|---|---|---|
| 1 | Seed the service with feed and non-feed particles | Particle list contains mixed entries |
| 2 | Call `cleanAndPopulate()` | Feed particles are removed |
| 3 | Inspect the result | Background particles remain |

### FISH01: Starter fish creation creates three fish
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `createStarterFish()` | Starter fish are initialized |
| 2 | Inspect the fish array | Three fish exist |
| 3 | Check the names | Goldie, Blinky, and Ruby are present |

### FISH02: Adding a fish uses the requested type and coordinates
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `addFish('goldfish', 120, 140, 800, 600)` | Fish is created |
| 2 | Inspect the last fish entry | Fish type is `goldfish` |
| 3 | Check coordinates | Fish is placed within the requested area |

### FISH03: Unknown fish types are ignored
| # | Step | Expected Result |
|---|---|---|
| 1 | Call `addFish('unknown-type')` | Method completes without throwing |
| 2 | Inspect the fish array | No fish is added |
| 3 | Re-check the list size | Size stays unchanged |

### FISH04: Fish update increases hunger and moves fish
| # | Step | Expected Result |
|---|---|---|
| 1 | Create a fish with an old `lastFeedTime` | Fish is ready for update |
| 2 | Call `updateFish()` with stable inputs | Fish is processed |
| 3 | Inspect the fish data | Hunger increases and movement is applied |

Total test cases: 20
